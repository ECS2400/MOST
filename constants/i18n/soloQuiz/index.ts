import type { Language } from '@/constants/i18n';
import { SOLO_QUIZ_DE } from './de';
import { SOLO_QUIZ_EN } from './en';
import { SOLO_QUIZ_ES } from './es';
import { SOLO_QUIZ_FR } from './fr';
import { SOLO_QUIZ_IT } from './it';
import { SOLO_QUIZ_PL } from './pl';
import type { SoloQuizBundle } from './types';

const BUNDLES: Record<Language, SoloQuizBundle> = {
  pl: SOLO_QUIZ_PL,
  en: SOLO_QUIZ_EN,
  de: SOLO_QUIZ_DE,
  fr: SOLO_QUIZ_FR,
  es: SOLO_QUIZ_ES,
  it: SOLO_QUIZ_IT,
};

export function getSoloQuizBundle(lang: Language): SoloQuizBundle {
  return BUNDLES[lang] ?? SOLO_QUIZ_PL;
}

export type { SoloQuizBundle, SoloQuizQuestion } from './types';
