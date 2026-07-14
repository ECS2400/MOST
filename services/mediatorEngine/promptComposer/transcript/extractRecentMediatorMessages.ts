import type { TranscriptMessage } from '@/types/mediator';
import { isRepetitionComparisonEligible } from '@/services/mediatorEngine/promptComposer/transcript/repetitionComparisonMessageTypes';

export interface RecentMediatorMessageRef {
  id: string;
  content: string;
  messageType?: string;
}

function filterTranscriptEntries(transcript: TranscriptMessage[] | unknown): TranscriptMessage[] {
  if (!Array.isArray(transcript)) return [];
  return transcript.filter(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      entry.authorRole === 'mediator' &&
      typeof entry.content === 'string' &&
      entry.content.trim().length > 0
  );
}

function toRef(entry: TranscriptMessage): RecentMediatorMessageRef {
  return {
    id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : 'mediator-unknown',
    content: entry.content.trim(),
    messageType: entry.messageType,
  };
}

/** All recent mediator bodies — prompt metadata / diagnostics only. */
export function extractRecentMediatorMessages(
  transcript: TranscriptMessage[] | unknown,
  limit = 3
): string[] {
  return extractRecentMediatorMessageRefs(transcript, limit).map((entry) => entry.content);
}

/** All recent mediator refs — includes summary/system for diagnostics. */
export function extractRecentMediatorMessageRefs(
  transcript: TranscriptMessage[] | unknown,
  limit = 3
): RecentMediatorMessageRef[] {
  return filterTranscriptEntries(transcript).map(toRef).slice(-limit);
}

/** Mediator moves used by repeated_intervention (excludes summary/system/opening). */
export function extractRepetitionComparisonMessages(
  transcript: TranscriptMessage[] | unknown,
  limit = 3
): string[] {
  return extractRepetitionComparisonMessageRefs(transcript, limit).map((entry) => entry.content);
}

/** Repetition comparison refs with transcript ids for validator diagnostics. */
export function extractRepetitionComparisonMessageRefs(
  transcript: TranscriptMessage[] | unknown,
  limit = 3
): RecentMediatorMessageRef[] {
  return filterTranscriptEntries(transcript)
    .filter((entry) => isRepetitionComparisonEligible(entry.messageType))
    .map(toRef)
    .slice(-limit);
}
