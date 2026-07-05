/** Counts question marks in text. */
export function countQuestions(text: string): number {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

/** Counts sentences using simple punctuation heuristics. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return Math.max(parts.length, 1);
}

/** Computes text metrics used by validation rules. */
export function computeTextMetrics(text: string): {
  lengthChars: number;
  questionCount: number;
  sentenceCount: number;
} {
  const trimmed = text.trim();
  return {
    lengthChars: trimmed.length,
    questionCount: countQuestions(trimmed),
    sentenceCount: countSentences(trimmed),
  };
}
