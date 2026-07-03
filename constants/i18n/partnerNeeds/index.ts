import type { Language } from '@/constants/i18n';
import type { PartnerNeedLabels } from './types';
import { PARTNER_NEED_LABELS_PL } from './pl';
import { PARTNER_NEED_LABELS_EN } from './en';
import { PARTNER_NEED_LABELS_IT } from './it';
import { PARTNER_NEED_LABELS_DE } from './de';
import { PARTNER_NEED_LABELS_FR } from './fr';
import { PARTNER_NEED_LABELS_ES } from './es';

export type { PartnerNeedLabels } from './types';

const MAP: Record<Language, PartnerNeedLabels> = {
  pl: PARTNER_NEED_LABELS_PL,
  en: PARTNER_NEED_LABELS_EN,
  it: PARTNER_NEED_LABELS_IT,
  de: PARTNER_NEED_LABELS_DE,
  fr: PARTNER_NEED_LABELS_FR,
  es: PARTNER_NEED_LABELS_ES,
};

export function getPartnerNeedLabels(lang: Language): PartnerNeedLabels {
  return MAP[lang] ?? PARTNER_NEED_LABELS_PL;
}
