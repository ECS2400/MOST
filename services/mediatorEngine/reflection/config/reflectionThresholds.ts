/** Deterministic thresholds for Reflection Engine L1. */
export const REFLECTION_THRESHOLDS = {
  /** Minimum confidence when structural signals fully align. */
  highConfidence: 85,
  /** Confidence when structural signals partially align. */
  mediumConfidence: 65,
  /** Confidence when structural signals contradict expectations. */
  lowConfidence: 40,
  /** Turns after which an expected effect is considered stale. */
  expectedEffectStaleTurns: 2,
  /** Blame loop count treated as active for readiness blocking. */
  blameLoopActiveCount: 1,
  /** Escalation level treated as active for readiness blocking. */
  escalationActiveLevel: 1,
  /** Load score at or above which participants are considered exhausted. */
  loadExhaustionThreshold: 80,
} as const;
