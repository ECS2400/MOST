import type { LimitAction } from '@/services/checkLimits';
import type { Router } from 'expo-router';

export type PaywallReason =
  | 'live_limit'
  | 'ocr_limit'
  | 'solo_limit'
  | 'ai_chat'
  | 'dispute_limit';

export const LIMIT_CHECK_ERROR =
  'Nie udało się sprawdzić limitu. Spróbuj ponownie.';

const ACTION_TO_REASON: Record<LimitAction, PaywallReason> = {
  create_live_mediation: 'live_limit',
  ocr_analyze: 'ocr_limit',
  solo_analysis: 'solo_limit',
  ai_chat: 'ai_chat',
  create_dispute: 'dispute_limit',
};

const REASON_MESSAGES: Record<PaywallReason, string> = {
  live_limit:
    'Osiągnięto miesięczny limit mediacji live w planie Free. Przejdź na Premium, aby kontynuować.',
  ocr_limit:
    'Osiągnięto miesięczny limit analizy OCR (Beta) w planie Free. Przejdź na Premium, aby kontynuować.',
  solo_limit:
    'Osiągnięto miesięczny limit analiz solo w planie Free. Przejdź na Premium, aby kontynuować.',
  ai_chat:
    'Czat AI jest dostępny w planie Premium. Odblokuj pełny dostęp, aby rozmawiać z coachem.',
  dispute_limit:
    'Osiągnięto miesięczny limit sporów w planie Free. Przejdź na Premium, aby kontynuować.',
};

export function actionToPaywallReason(action: LimitAction): PaywallReason {
  return ACTION_TO_REASON[action];
}

export function getPaywallReasonMessage(reason: PaywallReason): string {
  return REASON_MESSAGES[reason];
}

export class FeatureLimitBlockedError extends Error {
  readonly paywallReason: PaywallReason;

  constructor(paywallReason: PaywallReason, message?: string) {
    super(message ?? getPaywallReasonMessage(paywallReason));
    this.name = 'FeatureLimitBlockedError';
    this.paywallReason = paywallReason;
  }
}

export function navigateToPaywall(router: Pick<Router, 'push'>, reason: PaywallReason): void {
  router.push({ pathname: '/premium', params: { reason } });
}
