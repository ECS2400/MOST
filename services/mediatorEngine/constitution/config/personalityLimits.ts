import type { SessionPersonalityProfile } from '@/types/mediator';

/** Per-profile deterministic message constraints (L1). */
export const PERSONALITY_PROFILE_LIMITS: Record<
  SessionPersonalityProfile,
  { maxSentences: number; maxQuestions: number; maxExclamationMarks: number }
> = {
  gentle_guide: { maxSentences: 2, maxQuestions: 1, maxExclamationMarks: 0 },
  steady_mediator: { maxSentences: 3, maxQuestions: 2, maxExclamationMarks: 1 },
  warm_facilitator: { maxSentences: 4, maxQuestions: 2, maxExclamationMarks: 1 },
  calm_anchor: { maxSentences: 2, maxQuestions: 1, maxExclamationMarks: 0 },
};
