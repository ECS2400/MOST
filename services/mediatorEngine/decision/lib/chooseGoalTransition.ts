import type {
  DecisionEngineInput,
  ExplainabilityGoalTransition,
} from '@/types/mediator';
import {
  isGoalTransitionBlocked,
  mapSuggestedGoalTransition,
} from '@/services/mediatorEngine/decision/config/goalTransitionRules';

function isSafetyActive(input: DecisionEngineInput): boolean {
  return (
    input.safety?.preempted === true || input.priority?.conversationMode === 'SAFETY'
  );
}

/** Chooses goal transition respecting safety and priority preemption rules. */
export function chooseGoalTransition(input: DecisionEngineInput): ExplainabilityGoalTransition {
  const blocked = isGoalTransitionBlocked({
    safetyPreempted: input.safety?.preempted === true,
    safetyBlockGoalTransitions: input.safety?.blockGoalTransitions === true,
    priorityPreemptsGoalTransition: input.priority?.preemptsGoalTransition === true,
    conversationModeSafety: input.priority?.conversationMode === 'SAFETY',
  });

  if (blocked || isSafetyActive(input)) {
    return 'stay';
  }

  return mapSuggestedGoalTransition(input.strategy?.suggestedGoalTransition);
}

/** Whether safety mode is active for this turn. */
export function isSafetyDecisionMode(input: DecisionEngineInput): boolean {
  return isSafetyActive(input);
}
