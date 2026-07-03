import { SUPPORT_EMAIL } from '@/services/supportEmail';

export const LEGAL_ENTITY_NAME = 'SDIT';
export const APP_NAME = 'Most';
export const LEGAL_LAST_UPDATED = '2026-06-10';

/** Publiczna polityka prywatności (HTML, 6 języków). URL do Google Play Console. */
export const PUBLIC_PRIVACY_POLICY_URL =
  'http://most.legal.privacy.sdit.space/privacy.html';

export type LegalDocumentId = 'privacy' | 'terms' | 'subscriptions';
export type LegalLanguage = 'pl' | 'en' | 'it' | 'es' | 'de' | 'fr';

export const LEGAL_DOCUMENTS: Record<
  LegalDocumentId,
  { slug: LegalDocumentId; titlePl: string; titleEn: string }
> = {
  privacy: {
    slug: 'privacy',
    titlePl: 'Polityka prywatności',
    titleEn: 'Privacy Policy',
  },
  terms: {
    slug: 'terms',
    titlePl: 'Regulamin',
    titleEn: 'Terms of Service',
  },
  subscriptions: {
    slug: 'subscriptions',
    titlePl: 'Warunki subskrypcji',
    titleEn: 'Subscription Terms',
  },
};

export function getPublicPrivacyPolicyUrl(language: LegalLanguage = 'pl'): string {
  return `${PUBLIC_PRIVACY_POLICY_URL}?lang=${language}`;
}

export function getPublicLegalUrl(
  document: LegalDocumentId,
  language: LegalLanguage = 'pl'
): string {
  return getPublicPrivacyPolicyUrl(language);
}

export const DATA_CONTROLLER = {
  name: LEGAL_ENTITY_NAME,
  email: SUPPORT_EMAIL,
};
