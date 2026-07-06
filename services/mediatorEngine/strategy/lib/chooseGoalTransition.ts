import type { SuggestedGoalTransition } from '@/types/mediator';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import {
  isGoalAdvanceBlocked,
  type SafeStrategyContext,
} from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

/** Selects suggested goal transition based on readiness and blocking conditions. */
export function chooseGoalTransition(
  ctx: SafeStrategyContext,
  priority: StrategyPriorityKey
): SuggestedGoalTransition {
  if (isGoalAdvanceBlocked(ctx)) {
    return 'stay';
  }

  if (priority === 'BREAKTHROUGH' && ctx.bothReady) {
    return 'prepare_advance';
  }

  if (ctx.bothReady) {
    return 'prepare_advance';
  }

  const gc = ctx.goalContinuityContext;
  if (gc && !ctx.safetyActive && gc.confidence >= 40) {
    if (gc.recommendedGoalTransition === 'advance' || gc.recommendedGoalTransition === 'closure') {
      return 'prepare_advance';
    }
    if (gc.recommendedGoalTransition === 'regress') {
      return 'regress';
    }
  }

  return 'stay';
}
