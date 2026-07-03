/** Truncate at word boundary — never cuts mid-word like "bezpiecz." */
export function truncateAtWord(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.5) return slice.slice(0, lastSpace).trim() + '…';
  return slice.trim() + '…';
}

/** Heuristic: reply looks like hardcoded Polish offline coach text */
export function looksLikePolishCoachText(text: string): boolean {
  return /spoko|wkurza|pogadajmy|moim zdaniem|powiedz jednym zdaniem|co o tym sądzisz|zrozumiała|zostałeś sam/i.test(
    text
  );
}

/** Heuristic: analysis body looks Polish when another language was requested */
export function looksLikePolishAnalysis(text: string): boolean {
  return /wygląda na to|możesz czuć|najbardziej zabolało|zdrady|potrzebujesz|za konfliktem|szukasz dialogu/i.test(
    text
  );
}
