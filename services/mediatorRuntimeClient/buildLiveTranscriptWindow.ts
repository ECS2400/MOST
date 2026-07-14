import type { TranscriptMessage } from '@/types/mediator';
import { mapLiveMessageTypeForTranscript } from '@/services/mediatorEngine/promptComposer/transcript/repetitionComparisonMessageTypes';

export interface LiveTranscriptMessageLike {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: string;
}

/** Builds a prompt transcript window from live chat messages (request-only, not persisted). */
export function buildLiveTranscriptWindow(
  messages: LiveTranscriptMessageLike[],
  hostUserId: string,
  partnerUserIds: string[]
): TranscriptMessage[] {
  const transcript: TranscriptMessage[] = [];
  let turn = 1;

  for (const message of messages) {
    const content = message.content?.trim();
    if (!content) continue;

    let authorRole: TranscriptMessage['authorRole'] | null = null;
    if (message.sender_id === 'ai' || message.message_type === 'question' || message.message_type === 'summary') {
      authorRole = 'mediator';
    } else if (message.sender_id === hostUserId) {
      authorRole = 'host';
    } else if (partnerUserIds.includes(message.sender_id)) {
      authorRole = 'partner';
    }

    if (!authorRole) continue;

    if (message.message_type === 'question') {
      turn += 1;
    }

    transcript.push({
      id: message.id,
      authorRole,
      content,
      turnNumber: turn,
      createdAt: message.created_at,
      messageType: mapLiveMessageTypeForTranscript(message.message_type),
    });
  }

  return transcript.slice(-8);
}
