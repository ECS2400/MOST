import type { TherapeuticGoal, TherapeuticStrategy } from '@/types/mediator';

/** Default primary strategy for each therapeutic goal (L1). */
export const GOAL_STRATEGY_MAP: Record<TherapeuticGoal, TherapeuticStrategy> = {
  SAFE_OPENING: 'build_safety',
  EMOTION_NAMING: 'validate_emotions',
  EMOTION_UNDERSTANDING: 'deepen_emotions',
  EMOTION_ACKNOWLEDGMENT: 'increase_mutual_understanding',
  NEED_NAMING: 'transition_to_needs',
  PERSPECTIVE_SHARING: 'increase_mutual_understanding',
  REFRAME: 'increase_mutual_understanding',
  AGREEMENT: 'prepare_agreement',
  FUTURE_PLAN: 'prepare_agreement',
  CLOSURE: 'close_topic',
};

/** Resolves goal-based default strategy — unknown goals fall back to build_safety. */
export function strategyForGoal(goal: TherapeuticGoal | unknown): TherapeuticStrategy {
  if (typeof goal === 'string' && goal in GOAL_STRATEGY_MAP) {
    return GOAL_STRATEGY_MAP[goal as TherapeuticGoal];
  }
  return 'build_safety';
}
