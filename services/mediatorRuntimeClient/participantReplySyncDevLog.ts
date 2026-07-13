import type { ParticipantRole } from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface ParticipantReplySyncDevLogPayload {
  actor: ParticipantRole | 'system';
  eventKinds: string[];
  questionTurn: number | null;
  runtimeTurnNumber: number | null;
  pendingBefore: string;
  pendingAfter: string;
  hostReplied: boolean;
  partnerReplied: boolean;
  source: 'live_messages';
}

export function logParticipantReplySyncDev(payload: ParticipantReplySyncDevLogPayload): void {
  if (!__DEV__) return;
  console.log('[participantReplySync]', payload);
}

export function resolveRuntimePendingLabel(
  runtimeSession: RuntimeSession | null | undefined
): string {
  return runtimeSession?.pending.awaiting ?? 'none';
}
