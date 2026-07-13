import type { LiveSessionFlow } from '@/services/liveMediation';

/** Minimal session flow while runtime is unavailable — no 15-question legacy progression. */
export const RUNTIME_UNAVAILABLE_SESSION_FLOW: LiveSessionFlow = {
  stage: 'questions',
  questionNumber: 0,
  maxQuestions: 0,
  questionPhase: 'opening',
  extensionActive: false,
};
