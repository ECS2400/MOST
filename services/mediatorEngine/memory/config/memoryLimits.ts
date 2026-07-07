/** Bounded list sizes for Session Memory L1. */
export const SESSION_MEMORY_LIMITS = {
  maxBreakthroughs: 20,
  maxInterventionHistory: 50,
  maxRecentInterventionTypes: 10,
  maxAskedSignatures: 30,
  maxReflectionLog: 30,
  maxClosedTopics: 20,
  maxOpenTopics: 20,
  maxRegressHistory: 20,
  maxGoalTransitionHistory: 20,
  maxEffectivePatterns: 15,
  maxIneffectivePatterns: 15,
  maxConfirmedEmotions: 20,
  maxConfirmedNeeds: 20,
  maxRecurringNeeds: 10,
} as const;

export type SessionMemoryLimitKey = keyof typeof SESSION_MEMORY_LIMITS;
