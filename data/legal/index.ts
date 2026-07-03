import type { LegalDocumentId } from '@/constants/legal';
import type { Language } from '@/constants/i18n';
import type { LegalDocumentContent } from './types';
import {
  privacyPolicyPl,
  subscriptionTermsPl,
  termsOfServicePl,
} from './documents.pl';
import {
  privacyPolicyEn,
  subscriptionTermsEn,
  termsOfServiceEn,
} from './documents.en';

export function getLegalDocument(
  id: LegalDocumentId,
  language: Language
): LegalDocumentContent {
  const usePl = language === 'pl';

  switch (id) {
    case 'privacy':
      return usePl ? privacyPolicyPl : privacyPolicyEn;
    case 'terms':
      return usePl ? termsOfServicePl : termsOfServiceEn;
    case 'subscriptions':
      return usePl ? subscriptionTermsPl : subscriptionTermsEn;
    default:
      return privacyPolicyPl;
  }
}
