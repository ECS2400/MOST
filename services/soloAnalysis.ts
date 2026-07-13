import { sanitizeAnalysisPersona } from '@/services/analysisPersona';
import { callEdge, EDGE } from '@/services/supabase';
import {
  interpretMediationLocally,
  isAnalysisEchoingForm,
  type MediationAnalysis,
} from '@/services/mediationAnalysisInterpret';
import { mapAnalysisToView, type MappedAnalysisView } from '@/services/analysisViewMapper';
import { buildSoloMessageDraft, stripChipLabel } from '@/services/soloMessageDraft';
import { formatQuizContext, type SoloQuizAnswers } from '@/constants/soloQuiz';
import type { Language } from '@/constants/i18n';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { looksLikePolishAnalysis } from '@/utils/textTruncate';

export interface SoloAnalysisInput {
  situation: string;
  emotions: string[];
  needs: string[];
  quizAnswers?: SoloQuizAnswers;
}

export { stripChipLabel };

/** Buduje combined_description zgodny z formatem mediacji dla analyze-perspectives. */
export function buildSoloCombinedDescription(
  input: SoloAnalysisInput,
  language: Language = 'pl'
): string {
  const situation = input.situation.trim();
  const felt = input.emotions.map(stripChipLabel).filter(Boolean).join(', ');
  const needs = input.needs.map(stripChipLabel).filter(Boolean).join(', ');

  const labels = getSoloExtras(language).formLabels;
  const lines = [`${labels.whatHappened} ${situation}`];
  if (felt) lines.push(`${labels.howIFelt} ${felt}`);
  if (needs) lines.push(`${labels.whatINeed} ${needs}`);
  const quizBlock = input.quizAnswers ? formatQuizContext(input.quizAnswers, language) : '';
  if (quizBlock) lines.push(quizBlock);
  return lines.join('\n');
}

export async function resolveSoloAnalysis(
  combinedDescription: string,
  language: Language = 'pl',
  participantName?: string
): Promise<MediationAnalysis> {
  const extras = getSoloExtras(language);
  try {
    const edge = await callEdge<MediationAnalysis>(EDGE.analyzePerspectives, {
      perspectiveA: combinedDescription,
      perspectiveB: '',
      category: 'Solo Analysis',
      language,
      participant_name: participantName,
    });
    if (!isAnalysisEchoingForm(edge, combinedDescription)) {
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
          throw new Error(extras.errors.analyzeFailed);
        }
      }
      return sanitizeAnalysisPersona(edge);
    }
  } catch {
    if (language !== 'pl') {
      throw new Error(extras.errors.analyzeFailed);
    }
  }

  if (language !== 'pl') {
    throw new Error(extras.errors.analyzeFailed);
  }

  return interpretMediationLocally(combinedDescription, '', participantName);
}

export interface SoloAnalysisRunResult {
  view: MappedAnalysisView;
  raw: MediationAnalysis;
  combinedDescription: string;
}

export async function runSoloAnalysis(
  input: SoloAnalysisInput,
  language: Language = 'pl',
  participantName?: string
): Promise<SoloAnalysisRunResult> {
  const combined = buildSoloCombinedDescription(input, language);
  const raw = await resolveSoloAnalysis(combined, language, participantName);
  const extras = getSoloExtras(language);
  let view = mapAnalysisToView(raw, language);
  if (!view) {
    throw new Error(extras.errors.analyzePrepareFailed);
  }

  if (!view.suggestion?.quote) {
    view = {
      ...view,
      suggestion: {
        quote: buildSoloMessageDraft(input.emotions, input.needs),
        tip: extras.mapperDefaults.sayTip,
      },
    };
  }

  return { view, raw, combinedDescription: combined };
}
