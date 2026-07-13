import {
  EDGE,
  prepareSupabaseRequest,
  supabase,
  SUPABASE_ANON_KEY,
} from '@/services/supabase';
import {
  buildCheckLimitsRequestHeaders,
  resolveUserAccessToken,
  type CheckLimitsAuthDeps,
} from '@/services/checkLimits.auth';
import { assertFeatureAllowed } from '@/services/checkLimits.logic';
import {
  defaultFetch,
  runCheckLimitsRequest,
  type CheckLimitsRequestDeps,
} from '@/services/checkLimits.request';
import {
  type CheckLimitsResponse,
  type FeatureAccessOptions,
  type LimitAction,
  type LimitCheckErrorDetails,
  type LimitReason,
} from '@/services/checkLimits.types';

export type {
  CheckLimitsResponse,
  FeatureAccessOptions,
  LimitAction,
  LimitCheckErrorDetails,
  LimitReason,
} from '@/services/checkLimits.types';
export { LimitCheckTechnicalError } from '@/services/checkLimits.types';
export {
  buildCheckLimitsRequestHeaders,
  resolveUserAccessToken,
  type CheckLimitsAuthDeps,
} from '@/services/checkLimits.auth';

function defaultRequestDeps(): CheckLimitsRequestDeps {
  return {
    fetchImpl: defaultFetch,
    edgeUrl: EDGE.checkLimits,
    anonKey: SUPABASE_ANON_KEY,
    auth: {
      prepare: prepareSupabaseRequest,
      getSession: () => supabase.auth.getSession(),
      refreshSession: () => supabase.auth.refreshSession(),
    },
  };
}

async function runCheckLimits(
  action: LimitAction,
  options: FeatureAccessOptions,
  increment: boolean
): Promise<CheckLimitsResponse> {
  return runCheckLimitsRequest(action, options, increment, defaultRequestDeps());
}

/** Read-only limit check — does not increment usage. */
export async function checkFeatureAccess(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  return runCheckLimits(action, options, false);
}

/** Checks limit and increments usage when allowed. */
export async function incrementFeatureUsage(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  return runCheckLimits(action, options, true);
}

/** Throws when limit is reached or the check fails — no silent allow. */
export async function ensureFeatureAllowed(
  action: LimitAction,
  options: FeatureAccessOptions
): Promise<CheckLimitsResponse> {
  const result = await checkFeatureAccess(action, options);
  return assertFeatureAllowed(action, result);
}
