import type { MediatorLang } from '@/types/mediator';
import {
  ENGLISH_COMMON_WORDS,
  POLISH_COMMON_WORDS,
  POLISH_MARKERS,
} from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';

export type LanguageHeuristicResult = {
  matchesExpected: boolean;
  severity: 'block' | 'warn' | 'none';
  reason: string;
};

function looksPolish(text: string): boolean {
  return POLISH_MARKERS.test(text) || POLISH_COMMON_WORDS.test(text);
}

function looksEnglish(text: string): boolean {
  return ENGLISH_COMMON_WORDS.test(text) && !POLISH_MARKERS.test(text);
}

/** Lightweight language heuristic — not perfect, good enough for L1. */
export function detectLanguageLite(
  text: string,
  expectedLanguage: MediatorLang
): LanguageHeuristicResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { matchesExpected: false, severity: 'block', reason: 'Empty text for language check' };
  }

  if (expectedLanguage === 'pl') {
    if (looksPolish(trimmed)) {
      return { matchesExpected: true, severity: 'none', reason: 'Polish markers detected' };
    }
    if (looksEnglish(trimmed)) {
      return {
        matchesExpected: false,
        severity: 'block',
        reason: 'Expected Polish reply but English phrasing detected',
      };
    }
    return {
      matchesExpected: false,
      severity: 'warn',
      reason: 'Could not confirm Polish phrasing',
    };
  }

  if (expectedLanguage === 'en') {
    if (looksEnglish(trimmed)) {
      return { matchesExpected: true, severity: 'none', reason: 'English phrasing detected' };
    }
    if (looksPolish(trimmed)) {
      return {
        matchesExpected: false,
        severity: 'block',
        reason: 'Expected English reply but Polish markers detected',
      };
    }
    return {
      matchesExpected: false,
      severity: 'warn',
      reason: 'Could not confirm English phrasing',
    };
  }

  return { matchesExpected: true, severity: 'none', reason: 'Language check skipped for locale' };
}

export { looksPolish, looksEnglish };
