import { EN } from './en';
import { IT } from './it';
import { ES } from './es';
import { DE } from './de';
import { FR } from './fr';
import { PL_EXTENDED } from './pl';

export type Language = 'pl' | 'en' | 'it' | 'es' | 'de' | 'fr';

export type TranslationType = typeof EN;

export const LANGUAGES: { code: Language; label: string; flag: string; nativeName: string }[] = [
  { code: 'pl', label: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'it', label: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'de', label: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'fr', label: 'French', flag: '🇫🇷', nativeName: 'Français' },
];

export const translations: Record<Language, TranslationType> = {
  pl: PL_EXTENDED as unknown as TranslationType,
  en: EN,
  it: IT as unknown as TranslationType,
  es: ES as unknown as TranslationType,
  de: DE as unknown as TranslationType,
  fr: FR as unknown as TranslationType,
};

export function getTranslations(lang: Language): TranslationType {
  return translations[lang] ?? translations['pl'];
}

const LANGUAGE_ALIASES: Record<string, Language> = {
  pl: 'pl',
  en: 'en',
  it: 'it',
  de: 'de',
  fr: 'fr',
  es: 'es',
  polish: 'pl',
  english: 'en',
  italian: 'it',
  german: 'de',
  french: 'fr',
  spanish: 'es',
};

/** Maps app language codes and common name aliases to ISO codes for edge functions. */
export function normalizeAppLanguage(raw: unknown): Language {
  if (typeof raw !== 'string') return 'pl';
  const key = raw.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? 'pl';
}
