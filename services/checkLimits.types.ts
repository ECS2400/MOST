import { LIMIT_CHECK_ERROR } from '@/utils/paywallReason';

export type LimitAction =
  | 'create_dispute'
  | 'create_live_mediation'
  | 'solo_analysis'
  | 'ocr_analyze'
  | 'ai_chat';

export type LimitReason = 'premium' | 'free_available' | 'limit_reached';

export interface CheckLimitsResponse {
  allowed: boolean;
  isPremium: boolean;
  used: number;
  limit: number | null;
  resetAt: string;
  reason: LimitReason;
}

export interface FeatureAccessOptions {
  userId: string;
  coupleId?: string;
  usageKey?: string;
}

export interface LimitCheckErrorDetails {
  status?: number;
  code?: string;
  action: LimitAction;
}

export class LimitCheckTechnicalError extends Error {
  readonly details: LimitCheckErrorDetails;

  constructor(details: LimitCheckErrorDetails, message = LIMIT_CHECK_ERROR) {
    super(message);
    this.name = 'LimitCheckTechnicalError';
    this.details = details;
  }
}
