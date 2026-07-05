/** Field names that must never appear in composed prompts. */
export const FORBIDDEN_PROMPT_FIELD_NAMES = [
  'sessionId',
  'mediationId',
  'userId',
  'evidenceStore',
  'EvidenceStore',
  'matchedText',
  'evidenceRef',
  'email',
  'phone',
  'token',
  'auth',
] as const;

/** Substrings that must not appear in composed prompts. */
export const FORBIDDEN_PROMPT_SUBSTRINGS = [
  '"evidenceStore"',
  '"sessionMemory"',
  'sessionMemory":{',
  'mediationState":{',
  '"matchedText"',
] as const;

/** User-facing prohibitions included in user prompt. */
export const USER_PROMPT_PROHIBITIONS = [
  'Do not mention pipeline, strategy engine, confidence scores, or JSON.',
  'Do not reference internal tests or system modules.',
  'Do not output JSON — write plain mediator speech only.',
] as const;
