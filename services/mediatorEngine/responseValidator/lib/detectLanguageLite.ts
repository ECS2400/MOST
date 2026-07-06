import type { MediatorLang } from '@/types/mediator';
import {
  ENGLISH_COMMON_WORDS,
  ENGLISH_STRONG_MARKERS,
  FRENCH_COMMON_WORDS,
  GERMAN_COMMON_WORDS,
  ITALIAN_COMMON_WORDS,
  POLISH_COMMON_WORDS,
  POLISH_MARKERS,
  SPANISH_COMMON_WORDS,
} from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';

export type LanguageHeuristicResult = {
  matchesExpected: boolean;
  severity: 'block' | 'warn' | 'none';
  reason: string;
};

const SECONDARY_LANGS: MediatorLang[] = ['es', 'it', 'de', 'fr'];

function looksPolish(text: string): boolean {
  return POLISH_MARKERS.test(text) || POLISH_COMMON_WORDS.test(text);
}

function looksEnglish(text: string): boolean {
  return ENGLISH_COMMON_WORDS.test(text) && !POLISH_MARKERS.test(text);
}

function looksEnglishStrong(text: string): boolean {
  return ENGLISH_STRONG_MARKERS.test(text) && !POLISH_MARKERS.test(text);
}

function looksSpanish(text: string): boolean {
  return SPANISH_COMMON_WORDS.test(text);
}

function looksItalian(text: string): boolean {
  return ITALIAN_COMMON_WORDS.test(text);
}

function looksGerman(text: string): boolean {
  return GERMAN_COMMON_WORDS.test(text);
}

function looksFrench(text: string): boolean {
  return FRENCH_COMMON_WORDS.test(text);
}

const LANGUAGE_DETECTORS: Partial<Record<MediatorLang, (text: string) => boolean>> = {
  pl: looksPolish,
  en: looksEnglish,
  es: looksSpanish,
  it: looksItalian,
  de: looksGerman,
  fr: looksFrench,
};

function looksLikeWrongPrimaryLanguage(text: string, expected: MediatorLang): boolean {
  if (expected !== 'pl' && looksPolish(text)) return true;
  if (expected !== 'en' && looksEnglishStrong(text)) return true;
  return false;
}

function looksLikeWrongSecondaryLanguage(text: string, expected: MediatorLang): boolean {
  if (looksPolish(text)) return true;
  if (expected !== 'en' && looksEnglishStrong(text)) return true;
  return false;
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

  const detector = LANGUAGE_DETECTORS[expectedLanguage];
  if (detector?.(trimmed)) {
    return { matchesExpected: true, severity: 'none', reason: `${expectedLanguage} markers detected` };
  }

  if (expectedLanguage === 'pl' || expectedLanguage === 'en') {
    if (looksLikeWrongPrimaryLanguage(trimmed, expectedLanguage)) {
      return {
        matchesExpected: false,
        severity: 'block',
        reason: `Expected ${expectedLanguage} reply but different language detected`,
      };
    }
    return {
      matchesExpected: false,
      severity: 'warn',
      reason: `Could not confirm ${expectedLanguage} phrasing`,
    };
  }

  if (SECONDARY_LANGS.includes(expectedLanguage)) {
    if (looksLikeWrongSecondaryLanguage(trimmed, expectedLanguage)) {
      const wrongLang = looksPolish(trimmed)
        ? 'Polish'
        : 'English';
      return {
        matchesExpected: false,
        severity: 'block',
        reason: `Expected ${expectedLanguage} reply but ${wrongLang} markers detected`,
      };
    }
    return {
      matchesExpected: false,
      severity: 'warn',
      reason: `Could not confirm ${expectedLanguage} phrasing`,
    };
  }

  return { matchesExpected: true, severity: 'none', reason: 'Language check skipped for locale' };
}

export {
  looksPolish,
  looksEnglish,
  looksEnglishStrong,
  looksSpanish,
  looksItalian,
  looksGerman,
  looksFrench,
};
