import type { TranscriptWindowEntry } from '@/types/mediator';
import type { ParticipantDisplayNames } from '@/services/mediatorEngine/participants/resolveParticipantDisplayName';

const DEFAULT_LABELS: ParticipantDisplayNames = {
  hostName: 'Ty',
  partnerName: 'druga strona',
};

/** Formats sanitized transcript entries for user prompt inclusion. */
export function formatTranscriptWindow(
  entries: TranscriptWindowEntry[],
  participantNames?: ParticipantDisplayNames
): string {
  if (entries.length === 0) return '(no recent messages)';

  const labels = participantNames ?? DEFAULT_LABELS;

  return entries
    .map((entry) => {
      const author =
        entry.authorRole === 'host'
          ? labels.hostName
          : entry.authorRole === 'partner'
            ? labels.partnerName
            : 'Mościk';
      return `${author}: ${entry.content}`;
    })
    .join('\n');
}
