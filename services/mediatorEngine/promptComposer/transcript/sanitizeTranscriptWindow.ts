import type { TranscriptMessage, TranscriptWindowEntry } from '@/types/mediator';
import { PROMPT_LIMITS } from '@/services/mediatorEngine/promptComposer/config/promptLimits';
import { normalizeWhitespace, redactPrivateFields } from '@/services/mediatorEngine/promptComposer/lib/redactPrivateFields';

function normalizeRole(value: unknown): TranscriptWindowEntry['authorRole'] {
  if (value === 'host' || value === 'partner' || value === 'mediator') return value;
  return 'mediator';
}

function truncateContent(content: string): string {
  if (content.length <= PROMPT_LIMITS.maxMessageChars) return content;
  return `${content.slice(0, PROMPT_LIMITS.maxMessageChars - 3)}...`;
}

/** Sanitizes transcript window — limits count and message length, redacts PII. */
export function sanitizeTranscriptWindow(
  messages: TranscriptMessage[] | unknown
): TranscriptWindowEntry[] {
  const list = Array.isArray(messages) ? messages : [];
  const recent = list.slice(-PROMPT_LIMITS.maxTranscriptMessages);

  return recent
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const raw = typeof entry.content === 'string' ? entry.content : '';
      const cleaned = truncateContent(normalizeWhitespace(redactPrivateFields(raw)));
      if (cleaned.length === 0) return null;
      return {
        authorRole: normalizeRole(entry.authorRole),
        content: cleaned,
      };
    })
    .filter((entry): entry is TranscriptWindowEntry => entry !== null);
}
