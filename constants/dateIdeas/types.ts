import type { Language } from '@/constants/i18n';

export type DateIdeaMood = 'calm' | 'romantic' | 'playful' | 'repair';
export type DateIdeaBudget = 'free' | 'low';
export type MediationClosureOutcome = 'resolved' | 'unresolved_but_closed';

export interface DateIdeaLocalizedText {
  title: string;
  description: string;
  whyItFits: string;
  costLabel: string;
}

export interface DateIdeaDefinition {
  id: string;
  budget: DateIdeaBudget;
  durationMinutes: number;
  mood: DateIdeaMood;
  texts: Record<Language, DateIdeaLocalizedText>;
}

export interface DateIdeaCatalogItem extends DateIdeaLocalizedText {
  id: string;
  budget: DateIdeaBudget;
  durationMinutes: number;
  mood: DateIdeaMood;
}
