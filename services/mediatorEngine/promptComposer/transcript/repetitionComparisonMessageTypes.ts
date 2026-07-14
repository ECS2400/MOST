/** Mediator message types eligible for cross-turn repetition comparison. */
export const REPETITION_COMPARISON_MESSAGE_TYPES = new Set([
  'question',
  'intervention',
  'reflection',
  'challenge',
  'repair',
]);

/** Mediator message types excluded from repetition comparison (still allowed in prompt context). */
export const REPETITION_EXCLUDED_MESSAGE_TYPES = new Set([
  'summary',
  'system',
  'conversation_state',
  'opening',
  'loading',
  'hint',
]);

export function mapLiveMessageTypeForTranscript(messageType: string): string {
  const normalized = messageType.trim().toLowerCase();
  if (normalized === 'question') return 'question';
  if (normalized === 'summary') return 'summary';
  if (normalized === 'system') return 'system';
  if (normalized === 'hint') return 'hint';
  return 'intervention';
}

export function isRepetitionComparisonEligible(messageType: string | undefined): boolean {
  if (!messageType) {
    // Engine fixtures without messageType: treat as intervention-eligible.
    return true;
  }
  const normalized = messageType.trim().toLowerCase();
  if (REPETITION_EXCLUDED_MESSAGE_TYPES.has(normalized)) return false;
  return REPETITION_COMPARISON_MESSAGE_TYPES.has(normalized);
}
