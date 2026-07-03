import type { Language } from '@/constants/i18n';
import type { DateIdeaBudget } from './types';

export const DATE_IDEA_COST_LABELS: Record<Language, Record<DateIdeaBudget, string>> = {
  pl: { free: '0 zł', low: 'do 30 zł' },
  en: { free: '$0', low: 'under $15' },
  de: { free: '0 €', low: 'unter 15 €' },
  fr: { free: '0 €', low: 'moins de 15 €' },
  es: { free: '0 €', low: 'menos de 15 €' },
  it: { free: '0 €', low: 'sotto i 15 €' },
};
