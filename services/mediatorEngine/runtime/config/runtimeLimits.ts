/** Limits for engine runtime turn execution (Phase 2D). */
export const RUNTIME_LIMITS = {
  defaultMaxReplyAttempts: 2,
  engineVersion: 'v2.3',
} as const;

/** Snippets that must not appear in runtime metadata. */
export const RUNTIME_METADATA_FORBIDDEN_SNIPPETS = [
  'Host:',
  'Partner:',
  'Dialogue',
  'transcriptDelta',
  '"content":',
] as const;
