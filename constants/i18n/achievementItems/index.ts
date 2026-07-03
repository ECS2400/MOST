import type { Language } from '@/constants/i18n';
import { PL_ITEMS } from './pl';
import { EN_ITEMS } from './en';
import { DE_ITEMS } from './de';
import { FR_ITEMS } from './fr';
import { ES_ITEMS } from './es';
import { IT_ITEMS } from './it';
import type { AchievementItemText, AchievementItemsMap } from './types';

export type { AchievementItemText, AchievementItemsMap } from './types';

const MAP: Record<Language, AchievementItemsMap> = {
  pl: PL_ITEMS,
  en: EN_ITEMS,
  de: DE_ITEMS,
  fr: FR_ITEMS,
  es: ES_ITEMS,
  it: IT_ITEMS,
};

export function getAchievementItems(lang: Language): AchievementItemsMap {
  return MAP[lang] ?? PL_ITEMS;
}

export function getAchievementText(
  lang: Language,
  id: string,
): AchievementItemText {
  const items = getAchievementItems(lang);
  return items[id] ?? { title: id, description: '' };
}
