import type { Language } from '@/constants/i18n';
import { DATE_IDEA_COST_LABELS } from './costs';
import { DATE_IDEA_META } from './meta';
import type { DateIdeaCatalogItem } from './types';
import { DATE_IDEA_TEXTS_DE } from './texts/de';
import { DATE_IDEA_TEXTS_EN } from './texts/en';
import { DATE_IDEA_TEXTS_ES } from './texts/es';
import { DATE_IDEA_TEXTS_FR } from './texts/fr';
import { DATE_IDEA_TEXTS_IT } from './texts/it';
import { DATE_IDEA_TEXTS_PL } from './texts/pl';

export type {
  DateIdeaBudget,
  DateIdeaCatalogItem,
  DateIdeaDefinition,
  DateIdeaLocalizedText,
  DateIdeaMood,
  MediationClosureOutcome,
} from './types';

type DateIdeaTextEntry = { title: string; description: string; whyItFits: string };

const TEXTS_BY_LANG: Record<Language, Record<string, DateIdeaTextEntry>> = {
  pl: DATE_IDEA_TEXTS_PL,
  en: DATE_IDEA_TEXTS_EN,
  de: DATE_IDEA_TEXTS_DE,
  fr: DATE_IDEA_TEXTS_FR,
  es: DATE_IDEA_TEXTS_ES,
  it: DATE_IDEA_TEXTS_IT,
};

export function getDateIdeasCatalog(lang: Language): DateIdeaCatalogItem[] {
  const texts = TEXTS_BY_LANG[lang] ?? TEXTS_BY_LANG.pl;
  const costs = DATE_IDEA_COST_LABELS[lang] ?? DATE_IDEA_COST_LABELS.pl;

  return DATE_IDEA_META.map((meta) => {
    const text = texts[meta.id];
    if (!text) {
      throw new Error(`Missing date idea text for id "${meta.id}" (lang: ${lang})`);
    }

    return {
      id: meta.id,
      budget: meta.budget,
      durationMinutes: meta.durationMinutes,
      mood: meta.mood,
      title: text.title,
      description: text.description,
      whyItFits: text.whyItFits,
      costLabel: costs[meta.budget],
    };
  });
}
