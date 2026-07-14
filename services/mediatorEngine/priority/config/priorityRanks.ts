import type { PrioritySignalType } from '@/types/mediator';

/** Lower number = higher urgency (P0 safety = 0). */
export const PRIORITY_RANKS: Record<PrioritySignalType, number> = {
  safety: 0,
  repair_voice: 1,
  escalation: 1,
  recovery: 2,
  blame_loop: 3,
  breakthrough: 4,
  exhaustion: 5,
  stuck: 5,
  readiness: 6,
  evasion: 6,
  default_strategy: 7,
};

/** Escalation level at or above which escalation signal activates. */
export const ESCALATION_LEVEL_THRESHOLD = 1;

/** Blame loop count at or above which blame_loop signal activates. */
export const BLAME_LOOP_COUNT_THRESHOLD = 1;

/** Confidence threshold for reflection readiness signal. */
export const READINESS_CONFIDENCE_THRESHOLD = 70;
