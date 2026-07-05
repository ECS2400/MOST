/** Draft violation emitted by a rule — severity/articleRef come from the registry. */
export interface L1ViolationDraft {
  ruleId: string;
  matchedText: string;
}

/** Builds a rule violation draft without severity (resolved by registry wrapper). */
export function createViolation(ruleId: string, matchedText: string): L1ViolationDraft {
  return { ruleId, matchedText };
}
