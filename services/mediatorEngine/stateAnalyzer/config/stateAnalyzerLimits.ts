/** Limits and thresholds for State Analyzer L1. */
export const STATE_ANALYZER_LIMITS = {
  maxConclusions: 80,
  /** Turns before confidence decay begins. */
  decayStartAfterTurns: 2,
  /** Confidence points removed per elapsed turn after decay starts. */
  decayPercentPerTurn: 5,
  /** Confidence below this marks the value stale. */
  staleConfidenceThreshold: 30,
  /** Decay factor reduction per turn for evidenced conclusions. */
  conclusionDecayFactorStep: 0.05,
} as const;

export const TRANSCRIPT_METADATA_ANALYSIS_PREFIX = 'transcript-metadata-turn-';

/** Placeholder content for transcript_metadata evidence — never stores payload text. */
export const TRANSCRIPT_METADATA_REDACTED_CONTENT = '[TRANSCRIPT_METADATA_REDACTED]';

/** Stable conclusion value for transcript metadata analyses. */
export const TRANSCRIPT_METADATA_CONCLUSION_VALUE = 'transcript_metadata';

/** Forbidden metadata keys that must never appear in transcript evidence. */
export const FORBIDDEN_TRANSCRIPT_METADATA_KEYS = [
  'content',
  'text',
  'body',
  'message',
  'raw',
  'quote',
] as const;
