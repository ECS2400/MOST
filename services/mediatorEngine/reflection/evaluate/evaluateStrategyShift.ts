import type { StrategyShift } from '@/types/mediator';
import type { SafeReflectionContext } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';
import {
  hasRepeatedIneffectivePattern,
  isExpectedEffectStale,
} from '@/services/mediatorEngine/reflection/evaluate/evaluateExpectedEffect';
import type { ExpectedEffectEvaluation } from '@/types/mediator';

export interface StrategyShiftEvaluation {
  shouldChangeStrategy: boolean;
  recommendedStrategyShift: StrategyShift;
}

export interface StrategyShiftInput {
  ctx: SafeReflectionContext;
  lastInterventionHelpful: boolean;
  conversationMovedForward: boolean;
  expectedEffectEvaluation: ExpectedEffectEvaluation | null;
}

/** Determines whether the therapeutic strategy should change. */
export function evaluateShouldChangeStrategy(input: StrategyShiftInput): boolean {
  const { ctx, lastInterventionHelpful, conversationMovedForward, expectedEffectEvaluation } =
    input;

  if (!lastInterventionHelpful) return true;
  if (!conversationMovedForward) return true;
  if (isExpectedEffectStale(ctx)) return true;
  if (hasRepeatedIneffectivePattern(ctx)) return true;
  if (ctx.stateAfter.dynamics?.blameLoopDetected === true) return true;
  if (ctx.stateAfter.dynamics?.escalationDetected === true) return true;
  if (expectedEffectEvaluation?.achieved === false && expectedEffectEvaluation.partial === false) {
    return true;
  }

  return false;
}

/** Selects a deterministic strategy shift recommendation. */
export function evaluateRecommendedStrategyShift(
  ctx: SafeReflectionContext,
  shouldChangeStrategy: boolean,
  lastInterventionHelpful: boolean
): StrategyShift {
  const safetyActive =
    ctx.safetyLevel !== 'none' || ctx.stateAfter.dynamics?.mode === 'SAFETY';
  if (safetyActive) return 'pause';

  if (ctx.stateAfter.dynamics?.breakthroughDetected === true) return 'consolidate';

  if (ctx.stateAfter.recovery !== null) return 'recover';

  const escalation =
    ctx.stateAfter.dynamics?.escalationDetected === true ||
    (ctx.stateAfter.dynamics?.escalationLevel ?? 0) > 0;
  const blameLoop = ctx.stateAfter.dynamics?.blameLoopDetected === true;

  if (blameLoop || (escalation && shouldChangeStrategy)) return 'deescalate';

  const loadExhausted = ctx.stateAfter.load?.exhaustionDetected?.value === true;
  if (loadExhausted) return 'slow_down';

  if (!lastInterventionHelpful && shouldChangeStrategy) return 'recover';

  if (!shouldChangeStrategy) return 'continue';

  if (!lastInterventionHelpful) return 'recover';

  return 'slow_down';
}

/** Combines strategy shift flags and recommendation. */
export function evaluateStrategyShift(input: StrategyShiftInput): StrategyShiftEvaluation {
  const shouldChangeStrategy = evaluateShouldChangeStrategy(input);
  const recommendedStrategyShift = evaluateRecommendedStrategyShift(
    input.ctx,
    shouldChangeStrategy,
    input.lastInterventionHelpful
  );

  return { shouldChangeStrategy, recommendedStrategyShift };
}
