/** Terms that must not appear in mediator draft replies. */
export const FORBIDDEN_LLM_TERMS = [
  'pipeline',
  'confidence',
  'json',
  'strategy engine',
  'as an ai language model',
  'evidencestore',
  'sessionmemory',
  'promptcomposer',
  'constitution validator',
  'intervention engine',
  'decision engine',
  'priority engine',
  'reflection engine',
  'state analyzer',
] as const;

/** Phrases that encourage continuing conflict — blocked under L2/L3. */
export const CONFLICT_ESCALATION_PHRASES = [
  'who is right',
  "who's right",
  'who is at fault',
  'kto ma rację',
  'kto jest winny',
  'decide who',
  'determine who',
] as const;

/** Safety/pause wording required under L2/L3. */
export const SAFETY_REQUIRED_PATTERNS_EN = [
  /\bpause\b/i,
  /\bsafety\b/i,
  /\btake a break\b/i,
  /\bslow down\b/i,
  /\bstep back\b/i,
] as const;

export const SAFETY_REQUIRED_PATTERNS_PL = [
  /\bpauz/i,
  /\bbezpiecze/i,
  /\bprzerw/i,
  /\bspowoln/i,
  /\boddech/i,
] as const;
