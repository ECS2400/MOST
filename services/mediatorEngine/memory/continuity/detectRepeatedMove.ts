import type { InterventionType } from '@/types/mediator';

const REPEATED_MOVE_THRESHOLD = 3;

export interface RepeatedMoveDetection {
  repeatedMoveDetected: boolean;
  repeatedMoveReason: string | null;
}

/** Detects when the same intervention type was used repeatedly without variation. */
export function detectRepeatedMove(
  recentInterventionTypes: readonly InterventionType[]
): RepeatedMoveDetection {
  if (recentInterventionTypes.length < REPEATED_MOVE_THRESHOLD) {
    return { repeatedMoveDetected: false, repeatedMoveReason: null };
  }

  const head = recentInterventionTypes.slice(0, REPEATED_MOVE_THRESHOLD);
  const first = head[0];
  const allSame = head.every((type) => type === first);

  if (!allSame || typeof first !== 'string') {
    return { repeatedMoveDetected: false, repeatedMoveReason: null };
  }

  return {
    repeatedMoveDetected: true,
    repeatedMoveReason: `${first} used ${REPEATED_MOVE_THRESHOLD} times in recent turns`,
  };
}
