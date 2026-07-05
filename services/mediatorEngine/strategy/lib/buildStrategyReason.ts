import type { TherapeuticIntent, TherapeuticStrategy } from '@/types/mediator';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';

/** Builds a short technical rationale string for strategy selection. */
export function buildStrategyReason(input: {
  priority: StrategyPriorityKey;
  reasonKey: string;
  primaryStrategy: TherapeuticStrategy;
  secondaryStrategy: TherapeuticStrategy | null;
  therapeuticIntent: TherapeuticIntent;
  suggestedGoalTransition: string;
}): string {
  const parts = [
    `priority=${input.priority.toLowerCase()}`,
    `reason=${input.reasonKey}`,
    `primary=${input.primaryStrategy}`,
    `intent=${input.therapeuticIntent}`,
    `goal_transition=${input.suggestedGoalTransition}`,
  ];
  if (input.secondaryStrategy) {
    parts.push(`secondary=${input.secondaryStrategy}`);
  }
  return parts.join('; ');
}
