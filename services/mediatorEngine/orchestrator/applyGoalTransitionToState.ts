import type { ExplainabilityGoalTransition } from '@/types/mediator/engineTypes';
import type { GoalContinuityContext } from '@/types/mediator/goalContinuity';
import type { MediationState } from '@/types/mediator';

export interface ApplyGoalTransitionToStateInput {
  state: MediationState;
  goalTransition: ExplainabilityGoalTransition;
  goalContinuityContext: GoalContinuityContext;
}

/**
 * Applies a decision-engine goal transition to persisted mediation state.
 *
 * Updates `currentGoal` when the decision is advance/regress and a recommended
 * next goal exists. Does not mutate the input state.
 */
export function applyGoalTransitionToState(
  input: ApplyGoalTransitionToStateInput
): MediationState {
  const { state, goalTransition, goalContinuityContext } = input;

  if (goalTransition !== 'advance' && goalTransition !== 'regress') {
    return state;
  }

  const nextGoal = goalContinuityContext.recommendedNextGoal;
  if (!nextGoal) {
    return state;
  }

  if (state.currentGoal === nextGoal) {
    return state;
  }

  return {
    ...state,
    currentGoal: nextGoal,
  };
}
