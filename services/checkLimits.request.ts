import {
  buildCheckLimitsRequestHeaders,
  resolveUserAccessToken,
  type CheckLimitsAuthDeps,
} from '@/services/checkLimits.auth';
import {
  isValidCheckLimitsResponse,
  mapCheckLimitsEdgeError,
} from '@/services/checkLimits.logic';
import { parseEdgeErrorBody } from '@/utils/edgeFunctionError';
import {
  LimitCheckTechnicalError,
  type CheckLimitsResponse,
  type FeatureAccessOptions,
  type LimitAction,
  type LimitCheckErrorDetails,
} from '@/services/checkLimits.types';

interface CheckLimitsRequestBody extends FeatureAccessOptions {
  user_id: string;
  couple_id?: string;
  action: LimitAction;
  increment?: boolean;
  usage_key?: string;
}

export interface CheckLimitsRequestDeps {
  fetchImpl: typeof fetch;
  auth: CheckLimitsAuthDeps;
  edgeUrl: string;
  anonKey: string;
}

/** Bound fetch wrapper — raw `fetch` reference breaks on web (loses Window context). */
export const defaultFetch: typeof fetch = (...args) => globalThis.fetch(...args);

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

function logLimitCheckDevError(
  action: LimitAction,
  options: FeatureAccessOptions,
  details: {
    status?: number;
    code?: string;
    message?: string;
    hasUserAccessToken?: boolean;
  }
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  console.warn('[checkLimits] LimitCheckTechnicalError', {
    action,
    status: details.status,
    code: details.code,
    message: details.message,
    hasUserId: Boolean(options.userId),
    hasCoupleId: Boolean(options.coupleId),
    hasUserAccessToken: details.hasUserAccessToken ?? false,
  });
}

function throwLimitCheckTechnicalError(
  action: LimitAction,
  options: FeatureAccessOptions,
  details: Omit<LimitCheckErrorDetails, 'action'> & {
    message?: string;
    hasUserAccessToken?: boolean;
  }
): never {
  logLimitCheckDevError(action, options, {
    status: details.status,
    code: details.code,
    message: details.message,
    hasUserAccessToken: details.hasUserAccessToken,
  });
  throw new LimitCheckTechnicalError({ action, ...details });
}

export async function requestCheckLimits(
  action: LimitAction,
  options: FeatureAccessOptions,
  increment: boolean,
  deps: CheckLimitsRequestDeps
): Promise<CheckLimitsResponse> {
  const accessToken = await resolveUserAccessToken(deps.auth);

  if (!accessToken) {
    throwLimitCheckTechnicalError(action, options, {
      code: 'SESSION_ACCESS_TOKEN_MISSING',
      status: 401,
      message: 'Missing user access token for check-limits',
      hasUserAccessToken: false,
    });
  }

  const response = await deps.fetchImpl(deps.edgeUrl, {
    method: 'POST',
    headers: buildCheckLimitsRequestHeaders(accessToken, deps.anonKey),
    body: JSON.stringify(buildRequestBody(action, options, increment)),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw parseEdgeErrorBody(response.status, bodyText);
  }

  const result = (await response.json()) as CheckLimitsResponse;

  if (!isValidCheckLimitsResponse(result)) {
    throwLimitCheckTechnicalError(action, options, {
      code: 'INVALID_RESPONSE',
      message: 'check-limits returned malformed JSON',
      hasUserAccessToken: true,
    });
  }

  return result;
}

export async function runCheckLimitsRequest(
  action: LimitAction,
  options: FeatureAccessOptions,
  increment: boolean,
  deps: CheckLimitsRequestDeps
): Promise<CheckLimitsResponse> {
  try {
    return await requestCheckLimits(action, options, increment, deps);
  } catch (error) {
    if (error instanceof LimitCheckTechnicalError) {
      throw error;
    }

    const mapped = mapCheckLimitsEdgeError(action, error);
    logLimitCheckDevError(action, options, {
      status: mapped.details.status,
      code: mapped.details.code,
      message: mapped.message,
      hasUserAccessToken: true,
    });
    throw mapped;
  }
}
