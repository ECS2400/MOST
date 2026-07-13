import { createInitialMediationState } from '@/services/mediatorEngine/stateAnalyzer/factory/createInitialMediationState';
import type { MediationState, MediatorLang } from '@/types/mediator';

export interface BootstrapMediationContextInput {
  mediationId: string;
  sessionId: string;
  language: MediatorLang;
  combinedDescription?: string;
  partnerCombinedDescription?: string;
  analysis?: Record<string, unknown> | null;
  partnerAnalysis?: Record<string, unknown> | null;
}

function stringFromAnalysisField(
  analysis: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!analysis) return '';
  for (const key of keys) {
    const value = analysis[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function tagsFromAnalysisField(
  analysis: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string[] {
  if (!analysis) return [];
  for (const key of keys) {
    const value = analysis[key];
    if (Array.isArray(value)) {
      return value
        .filter((v) => typeof v === 'string' && v.length <= 32)
        .slice(0, 4) as string[];
    }
  }
  return [];
}

function primaryAnalysisContext(analysis: Record<string, unknown> | null | undefined): string {
  return (
    stringFromAnalysisField(
      analysis,
      'situation_summary',
      'key_trigger',
      'situation_facts',
      'core_conflict',
      'what_went_wrong',
      'perspective_gap_detail'
    ) || ''
  );
}

function hasIntakeContent(input: BootstrapMediationContextInput): boolean {
  return Boolean(
    input.combinedDescription?.trim() ||
      input.partnerCombinedDescription?.trim() ||
      input.analysis ||
      input.partnerAnalysis
  );
}

/** Seeds mediationState.conflict from pre-mediation questionnaire and analysis. */
export function buildBootstrapMediationStateFromContext(
  input: BootstrapMediationContextInput
): MediationState | null {
  if (!hasIntakeContent(input)) {
    return null;
  }

  const state = createInitialMediationState({
    turnNumber: 1,
    mediationId: input.mediationId,
    sessionId: input.sessionId,
    trigger: 'session_start',
    language: input.language,
  });

  const hostEmotions = tagsFromAnalysisField(input.analysis, 'user_emotions');
  const hostNeeds = tagsFromAnalysisField(input.analysis, 'user_needs');
  const partnerEmotions = tagsFromAnalysisField(
    input.partnerAnalysis,
    'user_emotions',
    'partner_user_emotions'
  );
  const partnerNeeds = tagsFromAnalysisField(
    input.partnerAnalysis,
    'user_needs',
    'partner_user_needs'
  );
  const keyTrigger =
    stringFromAnalysisField(input.analysis, 'key_trigger') ||
    stringFromAnalysisField(input.partnerAnalysis, 'key_trigger') ||
    null;

  const conflictSummary = [
    input.combinedDescription?.trim(),
    primaryAnalysisContext(input.analysis),
    input.partnerCombinedDescription?.trim(),
    primaryAnalysisContext(input.partnerAnalysis),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1000);

  state.conflict = {
    ...state.conflict,
    conflictSummary,
    preAnalysisContext: {
      hostEmotions,
      hostNeeds,
      partnerEmotions,
      partnerNeeds,
      keyTrigger,
    },
  };

  return state;
}
