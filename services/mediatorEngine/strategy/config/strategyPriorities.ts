/** L1 strategy selection priority tiers — lower number wins. */
export const STRATEGY_PRIORITY = {
  SAFETY: 1,
  RECOVERY: 2,
  ESCALATION: 3,
  EXHAUSTION: 4,
  BREAKTHROUGH: 5,
  GOAL_DEFAULT: 6,
} as const;

export type StrategyPriorityKey = keyof typeof STRATEGY_PRIORITY;

/** Confidence scores by selection tier. */
export const STRATEGY_CONFIDENCE = {
  safety: 90,
  recovery: 88,
  escalation: 85,
  exhaustion: 82,
  breakthrough: 80,
  goalDefault: 68,
  fallback: 45,
} as const;

/** Strategy duration hints by tier (turns). */
export const STRATEGY_DURATION_HINT: Record<StrategyPriorityKey | 'fallback', number> = {
  SAFETY: 1,
  RECOVERY: 2,
  ESCALATION: 1,
  EXHAUSTION: 2,
  BREAKTHROUGH: 1,
  GOAL_DEFAULT: 2,
  fallback: 1,
};

/** Strategies blocked during safety mode. */
export const SAFETY_BLOCKED_STRATEGIES = [
  'deepen_emotions',
  'transition_to_needs',
  'prepare_agreement',
  'close_topic',
] as const;

/** Strategies blocked during escalation/blame mode. */
export const ESCALATION_BLOCKED_STRATEGIES = [
  'deepen_emotions',
  'transition_to_needs',
  'prepare_agreement',
] as const;

/** Strategies blocked during exhaustion mode. */
export const EXHAUSTION_BLOCKED_STRATEGIES = [
  'deepen_emotions',
  'stop_escalation',
  'prepare_agreement',
] as const;
