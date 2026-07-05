import type { ConfidenceValue } from '@/types/mediator';
import { REFLECTION_THRESHOLDS } from '@/services/mediatorEngine/reflection/config/reflectionThresholds';
import { reflectionConfidence } from '@/services/mediatorEngine/reflection/lib/confidence';
import type { SafeReflectionContext } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';

export interface ConversationProgressResult {
  conversationMovedForward: ConfidenceValue<boolean>;
}

/** Evaluates whether the conversation structurally moved forward this turn. */
export function evaluateConversationProgress(ctx: SafeReflectionContext): ConversationProgressResult {
  const { transcriptMeta, turnAdvanced } = ctx;
  const hasNewNonEmptyMessages = transcriptMeta.nonEmptyMessageCount > 0;
  const moved = turnAdvanced && hasNewNonEmptyMessages;

  const evidence: string[] = [];
  if (turnAdvanced) evidence.push('turn-advanced');
  if (transcriptMeta.messageCount > 0) evidence.push(`messages:${transcriptMeta.messageCount}`);
  if (transcriptMeta.nonEmptyMessageCount > 0) {
    evidence.push(`non-empty:${transcriptMeta.nonEmptyMessageCount}`);
  }
  if (transcriptMeta.emptyMessageCount > 0 && transcriptMeta.nonEmptyMessageCount === 0) {
    evidence.push('empty-only');
  }

  const confidence = moved
    ? REFLECTION_THRESHOLDS.highConfidence
    : transcriptMeta.messageCount === 0
      ? REFLECTION_THRESHOLDS.highConfidence
      : REFLECTION_THRESHOLDS.mediumConfidence;

  return {
    conversationMovedForward: reflectionConfidence(moved, confidence, evidence),
  };
}

/** Returns true when the last intervention was structurally helpful. */
export function evaluateLastInterventionHelpful(ctx: SafeReflectionContext): ConfidenceValue<boolean> {
  const { lastCompliance, safetyLevel, stateAfter } = ctx;
  const safetyEscalation =
    safetyLevel !== 'none' || stateAfter.dynamics?.mode === 'SAFETY';

  if (safetyEscalation) {
    return reflectionConfidence(false, REFLECTION_THRESHOLDS.highConfidence, [
      'safety-escalation',
    ]);
  }

  if (lastCompliance) {
    const blocked =
      !lastCompliance.compliant || lastCompliance.blockingViolationCount > 0;
    if (blocked) {
      return reflectionConfidence(false, REFLECTION_THRESHOLDS.highConfidence, [
        'non-compliant',
        `violations:${lastCompliance.violationCount}`,
      ]);
    }
    return reflectionConfidence(true, REFLECTION_THRESHOLDS.highConfidence, ['compliant']);
  }

  return reflectionConfidence(true, REFLECTION_THRESHOLDS.mediumConfidence, [
    'compliance-unknown-default-helpful',
  ]);
}
