import type { Language } from '@/constants/i18n';
import { SOLO_EXTRAS_DE } from './de';
import { SOLO_EXTRAS_EN } from './en';
import { SOLO_EXTRAS_ES } from './es';
import { SOLO_EXTRAS_FR } from './fr';
import { SOLO_EXTRAS_IT } from './it';
import { SOLO_EXTRAS_PL } from './pl';
import type { SoloExtrasBundle } from './types';

const BUNDLES: Record<Language, SoloExtrasBundle> = {
  pl: SOLO_EXTRAS_PL,
  en: SOLO_EXTRAS_EN,
  de: SOLO_EXTRAS_DE,
  fr: SOLO_EXTRAS_FR,
  es: SOLO_EXTRAS_ES,
  it: SOLO_EXTRAS_IT,
};

export function getSoloExtras(lang: Language): SoloExtrasBundle {
  return BUNDLES[lang] ?? SOLO_EXTRAS_PL;
}

export type { SoloExtrasBundle } from './types';
