export { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity/buildGoalContinuityContext';
export { buildGoalContinuityHint } from '@/services/mediatorEngine/goalContinuity/buildGoalContinuityHint';
export { chooseGoalContinuityRecommendation } from '@/services/mediatorEngine/goalContinuity/chooseGoalContinuityRecommendation';
export { detectGoalCompletion } from '@/services/mediatorEngine/goalContinuity/detectGoalCompletion';
export { detectGoalStagnation } from '@/services/mediatorEngine/goalContinuity/detectGoalStagnation';
export {
  GOAL_FLOW_ORDER,
  GOAL_STAGNATION_TURN_THRESHOLD,
  dedupeGoals,
  nextGoalInFlow,
} from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
export type { BuildGoalContinuityContextInput } from '@/services/mediatorEngine/goalContinuity/types';
export type { GoalContinuityContext, GoalContinuityTransition } from '@/types/mediator/goalContinuity';
