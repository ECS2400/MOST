import type { Language } from '@/constants/i18n';
import type { ProductId } from '@/services/revenueCat';

export type AppCurrency = 'PLN' | 'USD' | 'EUR';

export function getCurrencyForLanguage(language: Language): AppCurrency {
  if (language === 'pl') return 'PLN';
  if (language === 'en') return 'USD';
  return 'EUR';
}

interface PriceEntry {
  amount: number;
  formatted: string;
}

const PRICES: Record<AppCurrency, Record<ProductId, PriceEntry>> = {
  PLN: {
    most_weekly: { amount: 14.99, formatted: '14,99 zł' },
    most_monthly: { amount: 49.99, formatted: '49,99 zł' },
    most_yearly: { amount: 399.99, formatted: '399,99 zł' },
    most_lifetime: { amount: 699.99, formatted: '699,99 zł' },
    most_solo_analysis: { amount: 9.99, formatted: '9,99 zł' },
  },
  USD: {
    most_weekly: { amount: 3.99, formatted: '$3.99' },
    most_monthly: { amount: 12.99, formatted: '$12.99' },
    most_yearly: { amount: 99.99, formatted: '$99.99' },
    most_lifetime: { amount: 149.99, formatted: '$149.99' },
    most_solo_analysis: { amount: 2.99, formatted: '$2.99' },
  },
  EUR: {
    most_weekly: { amount: 3.99, formatted: '€3,99' },
    most_monthly: { amount: 12.99, formatted: '€12,99' },
    most_yearly: { amount: 99.99, formatted: '€99,99' },
    most_lifetime: { amount: 149.99, formatted: '€149,99' },
    most_solo_analysis: { amount: 2.99, formatted: '€2,99' },
  },
};

const YEARLY_EQUIV: Record<AppCurrency, string> = {
  PLN: '33 zł',
  USD: '$8.33',
  EUR: '€8,33',
};

const YEARLY_ANNUAL_COMPARE: Record<AppCurrency, string> = {
  PLN: '600 zł/rok',
  USD: '$156/yr',
  EUR: '€156/an',
};

export function getPrice(productId: ProductId, language: Language): PriceEntry {
  const currency = getCurrencyForLanguage(language);
  return PRICES[currency][productId];
}

export function getYearlyMonthlyEquiv(language: Language): string {
  return YEARLY_EQUIV[getCurrencyForLanguage(language)];
}

export function getYearlyAnnualCompare(language: Language): string {
  return YEARLY_ANNUAL_COMPARE[getCurrencyForLanguage(language)];
}

export function getYearlySavings(language: Language): string | undefined {
  const currency = getCurrencyForLanguage(language);
  if (currency === 'PLN') return 'Oszczędzasz 200 zł';
  if (currency === 'USD') return 'Save $56';
  return 'Économisez 56 €';
}
