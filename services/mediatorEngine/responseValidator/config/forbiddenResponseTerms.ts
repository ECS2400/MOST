/** Terms that must not appear in validated mediator replies. */
export const FORBIDDEN_RESPONSE_TERMS = [
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

/** Technical leakage markers that must not appear in reply text. */
export const TECHNICAL_LEAKAGE_TERMS = [
  'sessionId',
  'sessionId:',
  'mediationId',
  'mediationId:',
  'evidenceStore',
  'sessionMemory',
  'providerResponse',
  'tokenUsage',
  '"sessionId"',
  '"mediationId"',
  '"evidenceStore"',
] as const;

/** Phrases indicating normal mediation — blocked under L2/L3. */
export const NORMAL_MEDIATION_PHRASES = [
  'let us explore',
  "let's explore",
  'what happened between',
  'move forward with the mediation',
  'kontynuujmy mediacj',
  'przeanalizujmy konflikt',
] as const;

export const SAFETY_WORDING_PATTERNS_EN = [
  /\bpause\b/i,
  /\bsafety\b/i,
  /\btake a break\b/i,
  /\bslow down\b/i,
  /\bstep back\b/i,
] as const;

export const SAFETY_WORDING_PATTERNS_PL = [
  /\bpauz/i,
  /\bbezpiecze/i,
  /\bprzerw/i,
  /\bspowoln/i,
  /\boddech/i,
  /\bspokojniej/i,
] as const;

/** Polish-exclusive letters — excludes ó (shared with Spanish) to avoid false positives. */
export const POLISH_MARKERS = /[ąćęłńśźż]/i;

export const POLISH_COMMON_WORDS =
  /\b(słyszę|rozumiem|proszę|chcę|zatrzymaj|zatrzymajmy|spokojnie|po kolei|zatrzymajmy się|to trudne|rozmow|bezpiecze|pauz|oddech|trudne|oboje|mówcie|weźcie)\b/i;

/** Broad English detection for expected-language confirmation. */
export const ENGLISH_COMMON_WORDS =
  /\b(I hear|I understand|please|let us|let's|let's pause|take your time|take a|moment|both of you|speak|pause|safety|breath|slow breath|one at a time|this is difficult)\b/i;

/** Unambiguous English phrases for wrong-language blocking (avoids DE/ES/FR loanwords like pause/moment). */
export const ENGLISH_STRONG_MARKERS =
  /\b(I hear|I understand|both of you|let us speak|let's speak|one at a time|this is difficult|take your time)\b/i;

export const SPANISH_COMMON_WORDS =
  /\b(escucho|entiendo|comprendo|entend|siento|ambos|momento|respir|difícil|pausa|seguridad|hablemos|tomemos|gracias|pueden|parece|importante|ustedes|escucha)\b/i;

export const ITALIAN_COMMON_WORDS =
  /\b(sento|entrambi|momento|respir|difficile|pausa|sicurezza|parliamo|prendiamo)\b/i;

export const GERMAN_COMMON_WORDS =
  /\b(höre|verstehe|verständlich|schwierig|moment|atmet|bitte|pause|sicherheit|sprechen|innehalten|gehört|lassen|wichtig|danke|können|merke)\b/i;

export const FRENCH_COMMON_WORDS =
  /\b(entends|difficile|moment|respiration|sécurité|parlons|prenons|pause)\b/i;
