import type {
  ExplainabilityGoalTransition,
  SuggestedGoalTransition,
} from '@/types/mediator';

/** Maps TSE suggested goal transition to Decision Engine output vocabulary. */
export function mapSuggestedGoalTransition(
  suggested: SuggestedGoalTransition | undefined
): ExplainabilityGoalTransition {
  switch (suggested) {
    case 'prepare_advance':
      return 'advance';
    case 'regress':
      return 'regress';
    case 'stay':
      return 'stay';
    default:
      return 'stay';
  }
}

/** Whether goal transition must remain on the current goal. */
export function isGoalTransitionBlocked(input: {
  safetyPreempted: boolean;
  safetyBlockGoalTransitions: boolean;
  priorityPreemptsGoalTransition: boolean;
  conversationModeSafety: boolean;
}): boolean {
  return (
    input.safetyPreempted ||
    input.conversationModeSafety ||
    input.safetyBlockGoalTransitions ||
    input.priorityPreemptsGoalTransition
  );
}
