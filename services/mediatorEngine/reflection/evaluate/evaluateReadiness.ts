import type { ConfidenceValue } from '@/types/mediator';
import { REFLECTION_THRESHOLDS } from '@/services/mediatorEngine/reflection/config/reflectionThresholds';
import { reflectionConfidence } from '@/services/mediatorEngine/reflection/lib/confidence';
import type { SafeReflectionContext } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';

export interface ReadinessEvaluation {
  host: ParticipantReadiness;
  partner: ParticipantReadiness;
}

export interface ParticipantReadiness {
  readyToAdvance: ConfidenceValue<boolean>;
  needsMoreTime: ConfidenceValue<boolean>;
  needsDifferentApproach: ConfidenceValue<boolean>;
  signals: string[];
}

function isEscalationActive(ctx: SafeReflectionContext): boolean {
  return (
    ctx.stateAfter.dynamics?.escalationDetected === true ||
    (ctx.stateAfter.dynamics?.escalationLevel ?? 0) >= REFLECTION_THRESHOLDS.escalationActiveLevel
  );
}

function isBlameLoopActive(ctx: SafeReflectionContext): boolean {
  return (
    ctx.stateAfter.dynamics?.blameLoopDetected === true ||
    (ctx.stateAfter.dynamics?.blameLoopCount ?? 0) >= REFLECTION_THRESHOLDS.blameLoopActiveCount
  );
}

function isLoadExhausted(ctx: SafeReflectionContext): boolean {
  const hostLoad = ctx.stateAfter.load?.host?.value ?? 0;
  const partnerLoad = ctx.stateAfter.load?.partner?.value ?? 0;
  const exhaustion = ctx.stateAfter.load?.exhaustionDetected?.value === true;
  return (
    exhaustion ||
    hostLoad >= REFLECTION_THRESHOLDS.loadExhaustionThreshold ||
    partnerLoad >= REFLECTION_THRESHOLDS.loadExhaustionThreshold
  );
}

function evaluateParticipantReadiness(
  ctx: SafeReflectionContext,
  conversationMovedForward: boolean,
  role: 'host' | 'partner'
): ParticipantReadiness {
  const signals: string[] = [];
  const escalation = isEscalationActive(ctx);
  const blameLoop = isBlameLoopActive(ctx);
  const loadExhausted = isLoadExhausted(ctx);

  if (conversationMovedForward) signals.push('conversation-moved');
  if (escalation) signals.push('escalation-active');
  if (blameLoop) signals.push('blame-loop-active');
  if (loadExhausted) signals.push('load-exhausted');

  const ready =
    conversationMovedForward && !escalation && !blameLoop && !loadExhausted;
  const needsMoreTime = !ready;
  const needsDifferentApproach =
    blameLoop || escalation || loadExhausted;

  const confidence = ready
    ? REFLECTION_THRESHOLDS.highConfidence
    : needsDifferentApproach
      ? REFLECTION_THRESHOLDS.highConfidence
      : REFLECTION_THRESHOLDS.mediumConfidence;

  return {
    readyToAdvance: reflectionConfidence(ready, confidence, [`${role}:${ready ? 'ready' : 'not-ready'}`]),
    needsMoreTime: reflectionConfidence(needsMoreTime, confidence, signals),
    needsDifferentApproach: reflectionConfidence(
      needsDifferentApproach,
      confidence,
      needsDifferentApproach ? signals : []
    ),
    signals,
  };
}

/** Evaluates per-participant readiness to advance based on structural state. */
export function evaluateReadiness(
  ctx: SafeReflectionContext,
  conversationMovedForward: boolean
): ReadinessEvaluation {
  return {
    host: evaluateParticipantReadiness(ctx, conversationMovedForward, 'host'),
    partner: evaluateParticipantReadiness(ctx, conversationMovedForward, 'partner'),
  };
}

export { isEscalationActive, isBlameLoopActive, isLoadExhausted };
