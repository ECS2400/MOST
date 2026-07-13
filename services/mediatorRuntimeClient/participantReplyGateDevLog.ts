export interface ParticipantReplyGateDevLogPayload {
  lastMediatorQuestionId: string | null;
  hostReplyMessageId: string | null;
  partnerReplyMessageId: string | null;
  hostReplied: boolean;
  partnerReplied: boolean;
  bothReplied: boolean;
  triggerReason: string;
  questionTurn?: number | null;
}

export function logParticipantReplyGateDev(payload: ParticipantReplyGateDevLogPayload): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[participantReplyGate]', payload);
}
