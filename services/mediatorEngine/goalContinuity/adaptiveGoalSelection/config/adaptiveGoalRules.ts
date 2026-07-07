/** Deterministic scoring thresholds for adaptive goal selection. */
export const ADAPTIVE_GOAL_RULES = {
  MIN_SCORE: 55,
  MIN_ADAPTIVE_DELTA: 10,
  BASELINE_BONUS: 15,
  MAX_SKIP: 2,
  REGRESS_COOLDOWN_TURNS: 2,
  MUTUAL_UNDERSTANDING_HIGH: 70,
  MUTUAL_UNDERSTANDING_LOW: 50,
  WEIGHTS: {
    completion: 25,
    bothReady: 20,
    acceptedByBoth: 30,
    mutualUnderstandingHigh: 15,
    mutualUnderstandingLow: -20,
    stagnation: 15,
    recentRegress: -25,
    fastTrack: 20,
  },
} as const;
