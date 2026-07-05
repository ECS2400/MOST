import type { TranscriptMessage } from '@/types/mediator';

/** Safely normalizes transcript delta to an array of message-like objects. */
export function safeTranscriptDelta(value: unknown): TranscriptMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is TranscriptMessage => {
    return !!entry && typeof entry === 'object';
  });
}

/** Returns true when message content is empty or whitespace-only. */
export function isEmptyMessageContent(content: unknown): boolean {
  return typeof content !== 'string' || content.trim().length === 0;
}
