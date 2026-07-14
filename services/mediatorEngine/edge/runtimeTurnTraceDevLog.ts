import type { ResponseValidationResult } from '@/types/mediator';
import type { RepeatedInterventionMatchDetail } from '@/services/mediatorEngine/responseValidator/lib/repetitionAnalysis';
import { MEDIATOR_RUNTIME_BUILD_ID } from '@/services/mediatorEngine/edge/mediatorRuntimeBuild';

function shouldEmitRuntimeTurnDiagnostics(): boolean {
  if (typeof Deno !== 'undefined') return true;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function previewText(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function failedRuleIds(validation: ResponseValidationResult): string[] {
  return [
    ...new Set(
      (validation.ruleResults ?? [])
        .filter((rule) => !rule.passed)
        .map((rule) => rule.ruleId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
}

export function logRepeatedInterventionMatch(params: {
  mediationId?: string;
  turnNumber?: number;
  attemptNumber?: number;
  candidateText: string;
  matchedPriorMessageId?: string | null;
  matchedPriorText?: string | null;
  matchedPhrase?: string | null;
  similarityScore?: number | null;
  threshold?: number | null;
  ruleDecision: 'pass' | 'block';
  matchDetail?: RepeatedInterventionMatchDetail | null;
}): void {
  if (!shouldEmitRuntimeTurnDiagnostics()) return;

  console.info('[REPEATED_INTERVENTION_MATCH]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    turnNumber: params.turnNumber ?? null,
    attemptNumber: params.attemptNumber ?? null,
    candidateText: previewText(params.candidateText),
    matchedPriorMessageId: params.matchedPriorMessageId ?? null,
    matchedPriorText: params.matchedPriorText ? previewText(params.matchedPriorText) : null,
    matchedPhrase: params.matchedPhrase ?? null,
    similarityScore: params.similarityScore ?? null,
    threshold: params.threshold ?? null,
    ruleDecision: params.ruleDecision,
    tokenOverlap: params.matchDetail?.tokenOverlap ?? null,
    tokenOverlapThreshold: params.matchDetail?.tokenOverlapThreshold ?? null,
    phraseHitCount: params.matchDetail?.phraseHitCount ?? null,
    phraseThreshold: params.matchDetail?.phraseThreshold ?? null,
    questionOverlap: params.matchDetail?.questionOverlap ?? null,
    matchedReasons: params.matchDetail?.matchedReasons ?? [],
  });
}

export function logRuntimeAttemptStart(params: {
  mediationId?: string;
  turnNumber?: number;
  attemptNumber?: number;
  trigger?: string;
}): void {
  if (!shouldEmitRuntimeTurnDiagnostics()) return;
  console.info('[RUNTIME_ATTEMPT_START]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    turnNumber: params.turnNumber ?? null,
    attemptNumber: params.attemptNumber ?? null,
    trigger: params.trigger ?? null,
  });
}

export function logRuntimeAttemptResult(params: {
  mediationId?: string;
  turnNumber?: number;
  attemptNumber?: number;
  originalProviderText?: string | null;
  effectiveValidatedText: string;
  draftValidationReasons?: string[];
  fallbackSubstituted?: boolean;
  validationAction: string;
  validationReasonCodes: string[];
  finalSource: string;
  retryInstruction?: string | null;
}): void {
  if (!shouldEmitRuntimeTurnDiagnostics()) return;
  console.info('[RUNTIME_ATTEMPT_RESULT]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    turnNumber: params.turnNumber ?? null,
    attemptNumber: params.attemptNumber ?? null,
    originalProviderText: params.originalProviderText
      ? previewText(params.originalProviderText, 1200)
      : null,
    effectiveValidatedText: previewText(params.effectiveValidatedText, 1200),
    draftValidationReasons: params.draftValidationReasons ?? [],
    fallbackSubstituted: params.fallbackSubstituted ?? false,
    validationAction: params.validationAction,
    validationReasonCodes: params.validationReasonCodes,
    finalSource: params.finalSource,
    retryInstruction: params.retryInstruction ? previewText(params.retryInstruction, 600) : null,
  });
}

export function logRuntimeTurnContext(params: {
  mediationId?: string;
  turnNumber?: number;
  trigger?: string;
  participantReplyCount?: number;
  participantReplies?: Array<{ role: string; messageId: string; contentPreview: string }>;
  transcriptDeltaCount?: number;
  transcriptWindowCount?: number;
  recentMediatorMessageCount?: number;
  recentMediatorMessages?: Array<{ messageId: string; contentPreview: string }>;
}): void {
  if (!shouldEmitRuntimeTurnDiagnostics()) return;
  console.info('[RUNTIME_TURN_CONTEXT]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    mediationId: params.mediationId ?? null,
    turnNumber: params.turnNumber ?? null,
    trigger: params.trigger ?? null,
    participantReplyCount: params.participantReplyCount ?? 0,
    participantReplies: params.participantReplies ?? [],
    transcriptDeltaCount: params.transcriptDeltaCount ?? 0,
    transcriptWindowCount: params.transcriptWindowCount ?? 0,
    recentMediatorMessageCount: params.recentMediatorMessageCount ?? 0,
    recentMediatorMessages: params.recentMediatorMessages ?? [],
  });
}

export { failedRuleIds, previewText };
