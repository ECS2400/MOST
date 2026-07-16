import type { MediationTurnV2Envelope } from '@/services/mediationTurnV2.types';

/**
 * After START_OR_RESUME success, never auto-dispatch mutating actions.
 * Mutating actions (CONTINUE / VOTE / FINISH / CLOSE / RETRY) require a user tap.
 */
export function planPostBootstrapClientAction(
  _envelope: MediationTurnV2Envelope
): 'none' {
  return 'none';
}

export function isMutatingTurnActionType(
  type: string
): type is 'CONTINUE' | 'VOTE' | 'FINISH' | 'CLOSE' | 'RETRY' {
  return (
    type === 'CONTINUE' ||
    type === 'VOTE' ||
    type === 'FINISH' ||
    type === 'CLOSE' ||
    type === 'RETRY'
  );
}
