/** Deterministic scoring thresholds for adaptive intervention selection. */
export const ADAPTIVE_INTERVENTION_RULES = {
  MIN_SCORE: 40,
  MIN_ADAPTIVE_DELTA: 10,
  BASELINE_BONUS: 15,
  WEIGHTS: {
    recommended: 10,
    prefer: 15,
    avoid: -25,
    lastEffective: 15,
    lastIneffective: -20,
    recentRepeat: -10,
    repeatedMove: -20,
  },
  RECENT_REPEAT_THRESHOLD: 2,
} as const;
