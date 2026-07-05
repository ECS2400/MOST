import type { EvidenceItemMetadata, IsoTimestamp, TranscriptMessage, TurnNumber } from '@/types/mediator';
import {
  isEmptyMessageContent,
  safeTranscriptDelta,
} from '@/services/mediatorEngine/stateAnalyzer/lib/safeTranscript';

export type TranscriptSpeakerRole = 'host' | 'partner' | 'mediator' | null;

/** Structural transcript metadata — no message content. */
export interface TranscriptTurnMetadata {
  turnNumber: TurnNumber;
  messageCount: number;
  emptyMessageCount: number;
  hasHostMessage: boolean;
  hasPartnerMessage: boolean;
  lastSpeakerRole: TranscriptSpeakerRole;
  messageIds: string[];
  latestTimestamp: IsoTimestamp | null;
}

function normalizeRole(value: unknown): TranscriptSpeakerRole {
  if (value === 'host' || value === 'partner' || value === 'mediator') return value;
  return null;
}

/** Extracts privacy-safe metadata from a transcript delta. */
export function extractTranscriptMetadata(
  transcriptDelta: unknown,
  turnNumber: TurnNumber
): TranscriptTurnMetadata {
  const messages = safeTranscriptDelta(transcriptDelta);
  let emptyMessageCount = 0;
  let hasHostMessage = false;
  let hasPartnerMessage = false;
  let lastSpeakerRole: TranscriptSpeakerRole = null;
  let latestTimestamp: IsoTimestamp | null = null;
  const messageIds: string[] = [];

  for (const message of messages) {
    if (typeof message.id === 'string' && message.id.length > 0) {
      messageIds.push(message.id);
    }

    if (isEmptyMessageContent(message.content)) {
      emptyMessageCount += 1;
    }

    const role = normalizeRole(message.authorRole);
    if (role === 'host') hasHostMessage = true;
    if (role === 'partner') hasPartnerMessage = true;
    if (role) lastSpeakerRole = role;

    if (typeof message.createdAt === 'string' && message.createdAt.length > 0) {
      if (!latestTimestamp || message.createdAt > latestTimestamp) {
        latestTimestamp = message.createdAt;
      }
    }
  }

  return {
    turnNumber,
    messageCount: messages.length,
    emptyMessageCount,
    hasHostMessage,
    hasPartnerMessage,
    lastSpeakerRole,
    messageIds,
    latestTimestamp,
  };
}

/** Maps transcript metadata to structured evidence fields without message content. */
export function toEvidenceItemMetadata(metadata: TranscriptTurnMetadata): EvidenceItemMetadata {
  return {
    turnNumber: metadata.turnNumber,
    messageCount: metadata.messageCount,
    emptyMessageCount: metadata.emptyMessageCount,
    hasHostMessage: metadata.hasHostMessage,
    hasPartnerMessage: metadata.hasPartnerMessage,
    lastSpeakerRole: metadata.lastSpeakerRole,
    messageIds: metadata.messageIds,
    latestTimestamp: metadata.latestTimestamp,
  };
}
