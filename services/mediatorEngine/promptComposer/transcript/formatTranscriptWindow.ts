import type { TranscriptWindowEntry } from '@/types/mediator';

const ROLE_LABEL: Record<TranscriptWindowEntry['authorRole'], string> = {
  host: 'Host',
  partner: 'Partner',
  mediator: 'Mediator',
};

/** Formats sanitized transcript entries for user prompt inclusion. */
export function formatTranscriptWindow(entries: TranscriptWindowEntry[]): string {
  if (entries.length === 0) return '(no recent messages)';

  return entries
    .map((entry) => `${ROLE_LABEL[entry.authorRole]}: ${entry.content}`)
    .join('\n');
}
