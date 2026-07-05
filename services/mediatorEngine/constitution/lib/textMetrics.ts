/** Combines primary and optional secondary intervention messages. */
export function combineInterventionText(
  primaryMessage: string,
  secondaryMessage?: string
): string {
  return [primaryMessage, secondaryMessage].filter(Boolean).join(' ');
}

/** Counts sentence-like segments terminated by `.`, `!`, or `?`. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}

/** Counts question marks in the combined message text. */
export function countQuestions(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

/** Counts exclamation marks in the combined message text. */
export function countExclamationMarks(text: string): number {
  return (text.match(/!/g) ?? []).length;
}

/** Detects repeated sentence-sized fragments (case-insensitive). */
export function findRepeatedSentence(text: string, minLength: number): string | null {
  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= minLength);
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (seen.has(sentence)) return sentence;
    seen.add(sentence);
  }
  return null;
}
