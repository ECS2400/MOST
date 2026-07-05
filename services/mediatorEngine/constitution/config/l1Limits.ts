/** Deterministic L1 limits for Constitution Validator. */
export const L1_LIMITS = {
  minMessageLength: 1,
  maxMessageLength: 1200,
  maxSentencesDefault: 4,
  maxQuestionsDefault: 2,
  minRepeatedSentenceLength: 8,
} as const;

export type L1Limits = typeof L1_LIMITS;
