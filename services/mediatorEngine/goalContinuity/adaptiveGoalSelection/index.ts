export { buildGoalCandidateSet } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/buildGoalCandidateSet';
export { chooseAdaptiveNextGoal } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/chooseAdaptiveNextGoal';
export { ADAPTIVE_GOAL_RULES } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/config/adaptiveGoalRules';
export {
  hasPingPongPattern,
  isCandidateAllowed,
  isCompletedGoal,
  isSafetyBlocking,
  wasRecentRegress,
} from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/goalTransitionGuards';
export { scoreGoalCandidate } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/scoreGoalCandidate';
export type {
  AdaptiveGoalSelectionInput,
  GoalCandidate,
  GoalCandidateKind,
  ScoredGoalCandidate,
} from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';
