import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { getLastMediatorQuestionMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

/** Counts AI mediator questions in persisted live_messages. */
export function countMediatorQuestions(messages: ParticipantReplyMessage[]): number {
  return messages.filter(
    (message) => message.message_type === 'question' && message.sender_id === 'ai'
  ).length;
}

/**
 * Source of truth for the active question round.
 * Uses live_messages count — never a stale runtimeSession.turnOrdinal mirror.
 */
export function resolveQuestionTurnFromMessages(
  messages: ParticipantReplyMessage[],
  runtimeTurnOrdinal?: number | null
): number | null {
  const lastQuestion = getLastMediatorQuestionMessage(messages);
  if (!lastQuestion) {
    return runtimeTurnOrdinal ?? null;
  }

  const fromMessages = Math.max(1, countMediatorQuestions(messages));
  if (runtimeTurnOrdinal == null) {
    return fromMessages;
  }

  // Reconcile: messages are authoritative; runtime ordinal may lag by one round.
  return Math.max(fromMessages, runtimeTurnOrdinal);
}
