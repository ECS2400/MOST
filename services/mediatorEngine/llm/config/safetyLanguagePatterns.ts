import type { MediatorLang } from '@/types/mediator';

/** Safety/pause wording patterns per language for L2/L3 validation. */
export const SAFETY_WORDING_PATTERNS: Record<MediatorLang, readonly RegExp[]> = {
  en: [/\bpause\b/i, /\bsafety\b/i, /\btake a break\b/i, /\bslow down\b/i, /\bstep back\b/i],
  pl: [/\bpauz/i, /\bbezpiecze/i, /\bprzerw/i, /\bspowoln/i, /\boddech/i, /\bspokojniej/i],
  es: [/\bpausa\b/i, /\bseguridad\b/i, /\brespir/i, /\bdetener\b/i],
  it: [/\bpausa\b/i, /\bsicurezza\b/i, /\brespir/i, /\bfermar/i],
  de: [/\bpause\b/i, /\bsicherheit\b/i, /\batmet\b/i, /\bstoppen\b/i],
  fr: [/\bpause\b/i, /\bsécurité\b/i, /\brespiration\b/i, /\barrêter\b/i],
};

/** Returns true when text contains safety/pause wording for the given language. */
export function hasSafetyWordingForLanguage(text: string, language: MediatorLang): boolean {
  const patterns = SAFETY_WORDING_PATTERNS[language] ?? SAFETY_WORDING_PATTERNS.en;
  return patterns.some((pattern) => pattern.test(text));
}

/** Legacy exports for backward compatibility. */
export const SAFETY_REQUIRED_PATTERNS_EN = SAFETY_WORDING_PATTERNS.en;
export const SAFETY_REQUIRED_PATTERNS_PL = SAFETY_WORDING_PATTERNS.pl;
