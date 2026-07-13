import type { TranscriptMessage } from '@/types/mediator';
import {
  deriveParticipantReplyStateFromMessages,
  type ParticipantReplyMessage,
} from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

export interface BothRepliesTranscriptMessage extends ParticipantReplyMessage {
  content: string;
  created_at: string;
}

/** Builds transcriptDelta with both participant replies after the active question. */
export function buildBothRepliesTranscriptDelta(
  messages: BothRepliesTranscriptMessage[],
  hostUserId: string,
  partnerUserIds: string[],
  questionTurn: number
): TranscriptMessage[] {
  const derived = deriveParticipantReplyStateFromMessages({
    messages,
    currentQuestionTurn: questionTurn,
    hostUserId,
    partnerUserIds,
  });

  if (!derived.bothReplied) {
    return [];
  }

  const transcript: TranscriptMessage[] = [];
  const replyIds = new Set(
    [derived.hostReplyMessageId, derived.partnerReplyMessageId].filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    )
  );

  for (const message of messages) {
    if (!replyIds.has(message.id) || message.message_type !== 'message' || !message.content.trim()) {
      continue;
    }

    const authorRole =
      message.id === derived.hostReplyMessageId
        ? 'host'
        : message.id === derived.partnerReplyMessageId
          ? 'partner'
          : message.sender_id === hostUserId
            ? 'host'
            : partnerUserIds.includes(message.sender_id)
              ? 'partner'
              : null;

    if (!authorRole) {
      continue;
    }

    transcript.push({
      id: message.id,
      authorRole,
      content: message.content.trim(),
      turnNumber: questionTurn,
      createdAt: message.created_at,
    });
  }

  return transcript;
}
