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

  return 'stay';
}
