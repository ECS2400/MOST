import type { Language } from '@/constants/i18n';
import { getClosureBundle } from '@/constants/i18n/closure';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { fmt } from '@/utils/i18nFormat';
import type { ClosureSurveyAnswers } from '@/constants/disputeClosureSurvey';
import type { MediationClosureOutcome } from '@/constants/dateIdeas/types';
import { pickDateIdea } from '@/services/dateIdeaPicker';
import type { MediationSummaryData } from '@/services/mediationSummary';
import {
  buildDefaultSummary,
  createAgreementId,
} from '@/services/mediationSummary';
import { supabase } from '@/services/supabase';
import {
  loadSoloChatSession,
  SoloChatSession,
} from '@/services/soloCoach';
import { finalizeSoloMediation } from '@/services/soloMediationRecord';
import { endLiveMediation } from '@/services/mediationLegacyCompat';

export interface DateIdea {
  id?: string;
  title: string;
  description: string;
  whyItFits: string;
  estimatedCost: string;
  durationMinutes?: number;
  budget?: 'free' | 'low';
}

export interface ClosureResult {
  surveyAnswers: ClosureSurveyAnswers;
  dateIdea: DateIdea;
  completedAt: string;
}

function localDateIdeaFallback(lang: Language): DateIdea {
  return getClosureBundle(lang).dateIdeaDefault;
}

export async function generateDateIdea(params: {
  mode: 'solo' | 'live';
  language?: Language;
  surveyAnswers: ClosureSurveyAnswers;
  situationSummary?: string;
  keyTrigger?: string;
  chatSnippet?: string;
  outcome?: MediationClosureOutcome;
  userId?: string;
  excludeIds?: string[];
}): Promise<{ dateIdea: DateIdea; source: string }> {
  const language = params.language || 'pl';

  try {
    const picked = await pickDateIdea({
      language,
      outcome: params.outcome,
      userId: params.userId,
      excludeIds: params.excludeIds,
    });
    return { dateIdea: picked.dateIdea, source: picked.source };
  } catch {
    return { dateIdea: localDateIdeaFallback(language), source: 'fallback' };
  }
}

export function buildSoloContext(session: SoloChatSession): {
  situationSummary: string;
  keyTrigger: string;
  chatSnippet: string;
} {
  const raw = session.raw;
  const situationSummary =
    session.combinedDescription ||
    (raw.situation_summary as string) ||
    session.view.situationSummary ||
    '';
  const keyTrigger = (raw.key_trigger as string) || '';
  const chatSnippet = session.messages
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
  return { situationSummary, keyTrigger, chatSnippet };
}

export async function prepareLiveMediationEnd(
  mediationId: string,
  messageCount: number,
  phase: number,
  errorMessage = 'Nie udało się zakończyć mediacji.'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: med, error: fetchError } = await supabase
      .from('mediations')
      .select('analysis, status')
      .eq('id', mediationId)
      .maybeSingle();

    if (fetchError) {
      return { ok: false, error: fetchError.message };
    }

    if (med?.status === 'pending_agreements' || med?.status === 'resolved') {
      return { ok: true };
    }

    const summary = buildDefaultSummary(
      (med?.analysis as Record<string, unknown>) || null,
      messageCount,
      phase
    );

    const endResult = await endLiveMediation(mediationId, summary as Record<string, unknown>);
    if (!endResult.ok) {
      return { ok: false, error: endResult.error };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : errorMessage };
  }
}

export async function saveLiveClosureResult(
  mediationId: string,
  result: ClosureResult,
  language: Language = 'pl'
): Promise<void> {
  const { data: med } = await supabase
    .from('mediations')
    .select('live_summary')
    .eq('id', mediationId)
    .maybeSingle();

  const existing = (med?.live_summary as MediationSummaryData) || {};
  const merged: MediationSummaryData = {
    ...existing,
    closureSurvey: result.surveyAnswers,
    dateIdea: result.dateIdea,
    closureCompletedAt: result.completedAt,
    nextSteps: [
      ...(existing.nextSteps || []),
      {
        id: createAgreementId(),
        text: fmt(getLiveMediationExtras(language).summary.closureDateStep, {
          title: result.dateIdea.title,
        }),
        date: '',
      },
    ],
  };

  await supabase
    .from('mediations')
    .update({
      live_summary: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId);
}

export async function completeSoloClosure(
  userId: string,
  session: SoloChatSession,
  result: ClosureResult
): Promise<void> {
  await finalizeSoloMediation(userId, session, result);
}

export { loadSoloChatSession };
export { inferClosureOutcomeFromStatus } from '@/services/dateIdeaPicker';
