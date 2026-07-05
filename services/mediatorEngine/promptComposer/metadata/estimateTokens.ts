/** Heuristic token estimate from character count. */
export function estimateTokens(text: string): number {
  if (typeof text !== 'string' || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/** Estimates total tokens across all prompt sections. */
export function estimatePromptTokens(sections: string[]): number {
  const combined = sections.filter(Boolean).join('\n');
  return estimateTokens(combined);
}
