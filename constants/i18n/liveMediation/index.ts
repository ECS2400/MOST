import type { Language } from '@/constants/i18n';
import { LIVE_MEDIATION_DE } from './de';
import { LIVE_MEDIATION_EN } from './en';
import { LIVE_MEDIATION_ES } from './es';
import { LIVE_MEDIATION_FR } from './fr';
import { LIVE_MEDIATION_IT } from './it';
import { LIVE_MEDIATION_PL } from './pl';
import type { LiveMediationBundle } from './types';

const BUNDLES: Record<Language, LiveMediationBundle> = {
  pl: LIVE_MEDIATION_PL,
  en: LIVE_MEDIATION_EN,
  de: LIVE_MEDIATION_DE,
  fr: LIVE_MEDIATION_FR,
  es: LIVE_MEDIATION_ES,
  it: LIVE_MEDIATION_IT,
};

export function getLiveMediationExtras(lang: Language): LiveMediationBundle {
  return BUNDLES[lang] ?? LIVE_MEDIATION_PL;
}

export type { LiveMediationBundle, LiveMediationServiceStrings } from './types';
