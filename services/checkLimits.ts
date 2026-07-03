import { callEdge, EDGE } from '@/services/supabase';
import {
  actionToPaywallReason,
  FeatureLimitBlockedError,
  LIMIT_CHECK_ERROR,
} from '@/utils/paywallReason';

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

interface CheckLimitsRequestBody extends FeatureAccessOptions {
  user_id: string;
  couple_id?: string;
  action: LimitAction;
  increment?: boolean;
  usage_key?: string;
}

function buildRequestBody(
  action: LimitAction,
  options: FeatureAccessOptions,
  increment: boolean
): CheckLimitsRequestBody {
  return {
    user_id: options.userId,
    couple_id: options.coupleId,
    action,
    increment,
    usage_key: options.usageKey,
  };
}

async function callCheckLimits(
  action: LimitAction,
  options: FeatureAccessOptions,
  increment: boolean
): Promise<CheckLimitsResponse> {
  try {
    return await callEdge<CheckLimitsResponse>(
      EDGE.checkLimits,
      buildRequestBody(action, options, increment)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nie udało się sprawdzić limitów. Spróbuj ponownie.';
    throw new Error(message);
  }
}

/** Read-only limit check — does not increment usage. */
export async function checkFeatureAccess(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  return callCheckLimits(action, options, false);
}

/** Checks limit and increments usage when allowed. */
export async function incrementFeatureUsage(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  return callCheckLimits(action, options, true);
}

/** Throws when limit is reached or the check fails — no silent allow. */
export async function ensureFeatureAllowed(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  let result: CheckLimitsResponse;
  try {
    result = await checkFeatureAccess(action, options);
  } catch {
    throw new Error(LIMIT_CHECK_ERROR);
  }

  if (!result.allowed) {
    throw new FeatureLimitBlockedError(actionToPaywallReason(action));
  }

  return result;
}
