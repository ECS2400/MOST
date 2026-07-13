import type { Language } from '@/constants/i18n';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import {
  interpretMediationLocally,
  isAnalysisEchoingForm,
  type MediationAnalysis,
} from '@/services/mediationAnalysisInterpret';
import { sanitizeAnalysisPersona } from '@/services/analysisPersona';
import {
  isValidMediationAnalysis,
  toMediationAnalysisError,
} from '@/services/mediationAnalysisRun.logic';
import {
  MediationAnalysisError,
  type MediationAnalysisRow,
  type MediationAnalysisStage,
} from '@/services/mediationAnalysisRun.types';
import { callEdge, EDGE, prepareSupabaseRequest, supabase } from '@/services/supabase';
import { looksLikePolishAnalysis } from '@/utils/textTruncate';

export type { MediationAnalysisRow, MediationAnalysisStage } from '@/services/mediationAnalysisRun.types';
export { MediationAnalysisError } from '@/services/mediationAnalysisRun.types';

export function logMediationAnalysisDev(
  stage: MediationAnalysisStage,
  details: Record<string, unknown>
): void {
  if (!__DEV__) return;
  console.warn('[mediationAnalysis]', { stage, ...details });
}

function perspectiveBFrom(mediation: MediationAnalysisRow): string {
  return (
    mediation.pasted_text?.trim() ||
    (mediation.screenshot_urls.length > 0
      ? 'Kontekst rozmowy ze zrzutów ekranu.'
      : '')
  );
}

export async function runMediationEdgeAnalysis(
  mediation: MediationAnalysisRow,
  language: string,
  participantName?: string
): Promise<MediationAnalysis> {
  const perspectiveA = mediation.combined_description;
  const perspectiveB = perspectiveBFrom(mediation);

  try {
    const result = await callEdge<MediationAnalysis>(EDGE.analyzePerspectives, {
      perspectiveA,
      perspectiveB,
      category: 'Mediacja',
      language,
      participant_name: participantName,
    });

    if (!isValidMediationAnalysis(result)) {
      logMediationAnalysisDev('parse_response', {
        status: 200,
        code: 'MALFORMED_RESPONSE',
        message: 'Missing analysis fields',
      });
      throw new MediationAnalysisError(
        'parse_response',
        'Invalid analysis response',
        { code: 'MALFORMED_RESPONSE' }
      );
    }

    return result;
  } catch (error) {
    if (error instanceof MediationAnalysisError) {
      throw error;
    }

    const mapped = toMediationAnalysisError('edge_call', error);
    logMediationAnalysisDev('edge_call', {
      status: mapped.status,
      code: mapped.code,
      message: mapped.message,
    });
    throw mapped;
  }
}

export async function resolveMediationAnalysis(
  mediation: MediationAnalysisRow,
  language: string,
  options?: { participantName?: string }
): Promise<MediationAnalysis> {
  const perspectiveB = perspectiveBFrom(mediation);
  const extras = getSoloExtras(language as Language);
  const participantName = options?.participantName;

  try {
    const edge = await runMediationEdgeAnalysis(mediation, language, participantName);
    if (!isAnalysisEchoingForm(edge, mediation.combined_description)) {
      if (language !== 'pl') {
        const blob = [
          edge.situation_summary,
          edge.emotions_explanation,
          edge.needs_explanation,
          edge.key_trigger,
        ]
          .filter(Boolean)
          .join(' ');
        if (looksLikePolishAnalysis(blob)) {
          throw new MediationAnalysisError(
            'parse_response',
            extras.errors.analyzeFailed,
            { code: 'LANGUAGE_MISMATCH' }
          );
        }
      }
      return sanitizeAnalysisPersona(edge);
    }
  } catch (error) {
    if (language !== 'pl') {
      if (error instanceof MediationAnalysisError) {
        throw error;
      }
      throw new MediationAnalysisError(
        'edge_call',
        extras.errors.analyzeFailed,
        { code: 'EDGE_UNAVAILABLE' }
      );
    }

    logMediationAnalysisDev('edge_call', {
      code: error instanceof MediationAnalysisError ? error.code : 'EDGE_FALLBACK',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (language !== 'pl') {
    throw new MediationAnalysisError(
      'edge_call',
      extras.errors.analyzeFailed,
      { code: 'EDGE_UNAVAILABLE' }
    );
  }

  return interpretMediationLocally(
    mediation.combined_description,
    perspectiveB,
    participantName
  );
}

export async function saveHostMediationAnalysis(
  mediationId: string,
  result: MediationAnalysis
): Promise<void> {
  await prepareSupabaseRequest();

  const { error } = await supabase
    .from('mediations')
    .update({
      analysis: result,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId);

  if (error) {
    logMediationAnalysisDev('save_analysis', {
      code: error.code,
      message: error.message,
    });
    throw new MediationAnalysisError(
      'save_analysis',
      error.message || 'Failed to save analysis',
      { code: error.code }
    );
  }
}

export async function fetchMediationForAnalysis(
  mediationId: string,
  userId: string,
  isPartner: boolean
): Promise<MediationAnalysisRow> {
  await prepareSupabaseRequest();

  const { data: mediation, error: fetchError } = await supabase
    .from('mediations')
    .select(
      'id, user_id, partner_id, combined_description, partner_combined_description, pasted_text, screenshot_urls, analysis, partner_analysis, status'
    )
    .eq('id', mediationId)
    .single();

  if (fetchError || !mediation) {
    logMediationAnalysisDev('fetch_mediation', {
      code: fetchError?.code,
      message: fetchError?.message || 'not_found',
    });
    throw new MediationAnalysisError(
      'fetch_mediation',
      fetchError?.message || 'Mediation not found',
      { code: fetchError?.code }
    );
  }

  const row = mediation as MediationAnalysisRow;
  const isHost = row.user_id === userId;
  const isPartnerRow = row.partner_id === userId;

  if (isPartner && !isPartnerRow) {
    throw new MediationAnalysisError('fetch_mediation', 'Mediation not found', {
      code: 'FORBIDDEN',
    });
  }

  if (!isPartner && !isHost) {
    throw new MediationAnalysisError('fetch_mediation', 'Mediation not found', {
      code: 'FORBIDDEN',
    });
  }

  return row;
}
