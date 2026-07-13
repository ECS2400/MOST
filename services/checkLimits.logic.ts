import type { LimitAction } from '@/services/checkLimits.types';
import { EdgeFunctionError } from '@/utils/edgeFunctionError';
import {
  actionToPaywallReason,
  FeatureLimitBlockedError,
  LIMIT_CHECK_ERROR,
} from '@/utils/paywallReason';
import { LimitCheckTechnicalError } from '@/services/checkLimits.types';

export type { CheckLimitsResponse, FeatureAccessOptions, LimitCheckErrorDetails } from '@/services/checkLimits.types';
export { LimitCheckTechnicalError } from '@/services/checkLimits.types';

export function isValidCheckLimitsResponse(
  value: unknown
): value is import('@/services/checkLimits.types').CheckLimitsResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.allowed === 'boolean' &&
    typeof record.isPremium === 'boolean' &&
    typeof record.used === 'number' &&
    (record.limit === null || typeof record.limit === 'number') &&
    typeof record.resetAt === 'string' &&
    (record.reason === 'premium' ||
      record.reason === 'free_available' ||
      record.reason === 'limit_reached')
  );
}

export function mapCheckLimitsEdgeError(
  action: LimitAction,
  error: unknown
): LimitCheckTechnicalError {
  if (error instanceof EdgeFunctionError) {
    return new LimitCheckTechnicalError(
      { action, status: error.status, code: error.code },
      LIMIT_CHECK_ERROR
    );
  }

  return new LimitCheckTechnicalError(
    {
      action,
      code: error instanceof Error ? error.message : 'UNKNOWN',
    },
    LIMIT_CHECK_ERROR
  );
}

export function assertFeatureAllowed(
  action: LimitAction,
  result: import('@/services/checkLimits.types').CheckLimitsResponse
): import('@/services/checkLimits.types').CheckLimitsResponse {
  if (!result.allowed) {
    if (result.reason === 'limit_reached') {
      throw new FeatureLimitBlockedError(actionToPaywallReason(action));
    }

    throw new LimitCheckTechnicalError({ action, code: 'UNEXPECTED_DENY' }, LIMIT_CHECK_ERROR);
  }

  return result;
}
