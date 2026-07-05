/** Limits for Prompt Composer L1 transcript and output sizing. */
export const PROMPT_LIMITS = {
  maxTranscriptMessages: 8,
  maxMessageChars: 700,
  defaultMaxOutputTokens: 220,
  defaultTemperature: 0.4,
  safetyTemperature: 0.2,
  safetyMaxOutputTokens: 180,
} as const;
