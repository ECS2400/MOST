/** Limits for post-LLM response validation (Phase 2C). */
export const RESPONSE_VALIDATION_LIMITS = {
  maxReplyChars: 900,
  maxQuestions: 1,
  maxSentences: 4,
  defaultMaxAttempts: 2,
} as const;
