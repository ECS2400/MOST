import type { StrategyEngineOutput, TherapeuticStrategy } from '@/types/mediator';
import { createEmptyStrategyOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  ESCALATION_BLOCKED_STRATEGIES,
  EXHAUSTION_BLOCKED_STRATEGIES,
  SAFETY_BLOCKED_STRATEGIES,
  STRATEGY_DURATION_HINT,
} from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import { buildStrategyReason } from '@/services/mediatorEngine/strategy/lib/buildStrategyReason';
import { chooseGoalTransition } from '@/services/mediatorEngine/strategy/lib/chooseGoalTransition';
import { choosePrimaryStrategy } from '@/services/mediatorEngine/strategy/lib/choosePrimaryStrategy';
import { chooseSecondaryStrategy } from '@/services/mediatorEngine/strategy/lib/chooseSecondaryStrategy';
import { chooseTherapeuticIntent } from '@/services/mediatorEngine/strategy/lib/chooseTherapeuticIntent';
import { confidenceForPriority } from '@/services/mediatorEngine/strategy/lib/confidence';
import type { SafeStrategyContext } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';
import { buildRecoveryStrategy } from '@/services/mediatorEngine/strategy/recovery/buildRecoveryStrategy';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';

function blockedStrategiesForPriority(priority: StrategyPriorityKey): TherapeuticStrategy[] {
  switch (priority) {
    case 'SAFETY':
      return [...SAFETY_BLOCKED_STRATEGIES];
    case 'ESCALATION':
      return [...ESCALATION_BLOCKED_STRATEGIES];
    case 'EXHAUSTION':
      return [...EXHAUSTION_BLOCKED_STRATEGIES];
    default:
      return [];
  }
}

/** Assembles the full StrategyEngineOutput from normalized L1 selection. */
export function buildStrategyOutput(ctx: SafeStrategyContext): StrategyEngineOutput {
  const base = createEmptyStrategyOutput();
  const choice = choosePrimaryStrategy(ctx);
  const secondaryStrategy = chooseSecondaryStrategy(ctx, choice.primaryStrategy, choice.priority);
  const therapeuticIntent = chooseTherapeuticIntent(ctx, choice.primaryStrategy, choice.priority);
  const suggestedGoalTransition = chooseGoalTransition(ctx, choice.priority);
  const recoveryStrategy = buildRecoveryStrategy(ctx);

  const rationale = buildStrategyReason({
    priority: choice.priority,
    reasonKey: choice.reasonKey,
    primaryStrategy: choice.primaryStrategy,
    secondaryStrategy,
    therapeuticIntent,
    suggestedGoalTransition: suggestedGoalTransition ?? 'stay',
  });

  return {
    ...base,
    primaryStrategy: choice.primaryStrategy,
    secondaryStrategy,
    therapeuticIntent,
    confidence: confidenceForPriority(choice.priority),
    rationale,
    blockedStrategies: blockedStrategiesForPriority(choice.priority),
    suggestedGoalTransition,
    strategyDurationHint: STRATEGY_DURATION_HINT[choice.priority],
    alignmentWithGoal: ctx.currentGoal,
    recoveryStrategy,
  };
}
