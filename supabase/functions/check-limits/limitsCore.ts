/**
 * check-limits core logic (testable without starting HTTP server).
 */
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type LimitAction =
  | 'create_dispute'
  | 'create_live_mediation'
  | 'solo_analysis'
  | 'ocr_analyze'
  | 'ai_chat';

export type LimitReason = 'premium' | 'free_available' | 'limit_reached';

export type ScopeType = 'user' | 'couple';

export interface LimitActionConfig {
  scope: ScopeType;
  limit: number;
}

export const FREE_LIMITS: Record<LimitAction, LimitActionConfig> = {
  create_live_mediation: { scope: 'couple', limit: 1 },
  solo_analysis: { scope: 'user', limit: 5 },
  ocr_analyze: { scope: 'user', limit: 3 },
  ai_chat: { scope: 'user', limit: 0 },
  create_dispute: { scope: 'user', limit: 3 },
};

export interface CheckLimitsRequest {
  user_id: string;
  couple_id?: string;
  action: LimitAction;
  increment?: boolean;
  usage_key?: string;
}

export interface CheckLimitsResponse {
  allowed: boolean;
  isPremium: boolean;
  used: number;
  limit: number | null;
  resetAt: string;
  reason: LimitReason;
}

export interface ProfilePremiumRow {
  plan?: string | null;
  plan_expires_at?: string | null;
}

export interface CouplePremiumRow {
  subscription_tier?: string | null;
  subscription_expires?: string | null;
  partner_1_id?: string | null;
  partner_2_id?: string | null;
}

export function isKnownLimitAction(value: unknown): value is LimitAction {
  return typeof value === 'string' && value in FREE_LIMITS;
}

export function getActionConfig(action: LimitAction): LimitActionConfig {
  return FREE_LIMITS[action];
}

export function getPeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getResetAt(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString();
}

export function isTimestampActive(value: string | null | undefined, now = new Date()): boolean {
  if (!value) return true;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() > now.getTime();
}

export function isProfilePremium(
  profile: ProfilePremiumRow | null | undefined,
  now = new Date()
): boolean {
  if (!profile || profile.plan !== 'premium') return false;
  return isTimestampActive(profile.plan_expires_at, now);
}

export function isCouplePremium(
  couple: CouplePremiumRow | null | undefined,
  now = new Date()
): boolean {
  if (!couple || couple.subscription_tier !== 'premium') return false;
  return isTimestampActive(couple.subscription_expires, now);
}

export function resolveIsPremium(
  profile: ProfilePremiumRow | null | undefined,
  couple: CouplePremiumRow | null | undefined,
  now = new Date()
): boolean {
  return isProfilePremium(profile, now) || isCouplePremium(couple, now);
}

export function resolveScope(
  action: LimitAction,
  userId: string,
  coupleId?: string | null
): { scopeType: ScopeType; scopeId: string } {
  const config = getActionConfig(action);
  if (config.scope === 'couple') {
    if (!coupleId) {
      throw new Error('COUPLE_ID_REQUIRED');
    }
    return { scopeType: 'couple', scopeId: coupleId };
  }
  return { scopeType: 'user', scopeId: userId };
}

export function buildPremiumResponse(resetAt: string): CheckLimitsResponse {
  return {
    allowed: true,
    isPremium: true,
    used: 0,
    limit: null,
    resetAt,
    reason: 'premium',
  };
}

export interface UsageDecisionInput {
  isPremium: boolean;
  used: number;
  limit: number;
  increment: boolean;
  usageKey?: string;
  usageKeyExists: boolean;
}

export interface UsageDecision {
  allowed: boolean;
  isPremium: boolean;
  used: number;
  limit: number | null;
  reason: LimitReason;
  shouldIncrementCounter: boolean;
  shouldInsertEvent: boolean;
}

export function planUsageDecision(input: UsageDecisionInput): UsageDecision {
  const { isPremium, used, limit, increment, usageKey, usageKeyExists } = input;

  if (isPremium) {
    return {
      allowed: true,
      isPremium: true,
      used,
      limit: null,
      reason: 'premium',
      shouldIncrementCounter: false,
      shouldInsertEvent: false,
    };
  }

  if (usageKey && usageKeyExists) {
    return {
      allowed: true,
      isPremium: false,
      used,
      limit,
      reason: 'free_available',
      shouldIncrementCounter: false,
      shouldInsertEvent: false,
    };
  }

  const allowed = limit > 0 && used < limit;

  if (!allowed) {
    return {
      allowed: false,
      isPremium: false,
      used,
      limit,
      reason: 'limit_reached',
      shouldIncrementCounter: false,
      shouldInsertEvent: false,
    };
  }

  if (!increment) {
    return {
      allowed: true,
      isPremium: false,
      used,
      limit,
      reason: 'free_available',
      shouldIncrementCounter: false,
      shouldInsertEvent: false,
    };
  }

  return {
    allowed: true,
    isPremium: false,
    used: used + 1,
    limit,
    reason: 'free_available',
    shouldIncrementCounter: true,
    shouldInsertEvent: Boolean(usageKey),
  };
}

export function buildCheckLimitsResponse(
  decision: UsageDecision,
  resetAt: string
): CheckLimitsResponse {
  return {
    allowed: decision.allowed,
    isPremium: decision.isPremium,
    used: decision.used,
    limit: decision.limit,
    resetAt,
    reason: decision.reason,
  };
}

export function validateRequestBody(body: unknown):
  | { ok: true; value: CheckLimitsRequest }
  | { ok: false; error: string; status: number } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'INVALID_BODY', status: 400 };
  }

  const raw = body as Record<string, unknown>;
  const userId = raw.user_id;
  if (typeof userId !== 'string' || !userId.trim()) {
    return { ok: false, error: 'MISSING_USER_ID', status: 400 };
  }

  if (!isKnownLimitAction(raw.action)) {
    return { ok: false, error: 'UNKNOWN_ACTION', status: 400 };
  }

  const coupleId = raw.couple_id;
  if (coupleId != null && typeof coupleId !== 'string') {
    return { ok: false, error: 'INVALID_COUPLE_ID', status: 400 };
  }

  const usageKey = raw.usage_key;
  if (usageKey != null && typeof usageKey !== 'string') {
    return { ok: false, error: 'INVALID_USAGE_KEY', status: 400 };
  }

  return {
    ok: true,
    value: {
      user_id: userId.trim(),
      couple_id: typeof coupleId === 'string' ? coupleId.trim() : undefined,
      action: raw.action,
      increment: raw.increment === true,
      usage_key: typeof usageKey === 'string' ? usageKey.trim() : undefined,
    },
  };
}

async function getUsedCount(
  admin: SupabaseClient,
  scopeType: ScopeType,
  scopeId: string,
  feature: LimitAction,
  period: string
): Promise<number> {
  const { data, error } = await admin
    .from('usage_counters')
    .select('used_count')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('feature', feature)
    .eq('period', period)
    .maybeSingle();

  if (error) {
    console.error('[check-limits] read counter failed', error);
    throw new Error('USAGE_READ_FAILED');
  }

  return data?.used_count ?? 0;
}

async function hasUsageEvent(
  admin: SupabaseClient,
  scopeType: ScopeType,
  scopeId: string,
  feature: LimitAction,
  usageKey: string,
  period: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('usage_events')
    .select('id')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('feature', feature)
    .eq('usage_key', usageKey)
    .eq('period', period)
    .maybeSingle();

  if (error) {
    console.error('[check-limits] read usage event failed', error);
    throw new Error('USAGE_READ_FAILED');
  }

  return Boolean(data?.id);
}

async function insertUsageEvent(
  admin: SupabaseClient,
  scopeType: ScopeType,
  scopeId: string,
  feature: LimitAction,
  usageKey: string,
  period: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('usage_events')
    .insert({
      scope_type: scopeType,
      scope_id: scopeId,
      feature,
      usage_key: usageKey,
      period,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return false;
    }
    console.error('[check-limits] insert usage event failed', error);
    throw new Error('USAGE_WRITE_FAILED');
  }

  return Boolean(data?.id);
}

async function incrementUsageCounter(
  admin: SupabaseClient,
  scopeType: ScopeType,
  scopeId: string,
  feature: LimitAction,
  period: string
): Promise<number> {
  const { data: existing, error: readError } = await admin
    .from('usage_counters')
    .select('id, used_count')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('feature', feature)
    .eq('period', period)
    .maybeSingle();

  if (readError) {
    console.error('[check-limits] read counter for increment failed', readError);
    throw new Error('USAGE_WRITE_FAILED');
  }

  if (existing?.id) {
    const next = (existing.used_count ?? 0) + 1;
    const { data, error } = await admin
      .from('usage_counters')
      .update({ used_count: next, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('used_count')
      .single();

    if (error) {
      console.error('[check-limits] update counter failed', error);
      throw new Error('USAGE_WRITE_FAILED');
    }

    return data.used_count;
  }

  const { data, error } = await admin
    .from('usage_counters')
    .insert({
      scope_type: scopeType,
      scope_id: scopeId,
      feature,
      period,
      used_count: 1,
    })
    .select('used_count')
    .single();

  if (error) {
    console.error('[check-limits] insert counter failed', error);
    throw new Error('USAGE_WRITE_FAILED');
  }

  return data.used_count;
}

export async function processCheckLimits(
  admin: SupabaseClient,
  request: CheckLimitsRequest,
  profile: ProfilePremiumRow | null,
  couple: CouplePremiumRow | null,
  now = new Date()
): Promise<CheckLimitsResponse> {
  const resetAt = getResetAt(now);
  const period = getPeriodKey(now);
  const isPremium = resolveIsPremium(profile, couple, now);

  if (isPremium) {
    return buildPremiumResponse(resetAt);
  }

  const { scopeType, scopeId } = resolveScope(
    request.action,
    request.user_id,
    request.couple_id
  );
  const { limit } = getActionConfig(request.action);

  let used = await getUsedCount(admin, scopeType, scopeId, request.action, period);
  const usageKeyExists = request.usage_key
    ? await hasUsageEvent(admin, scopeType, scopeId, request.action, request.usage_key, period)
    : false;

  let decision = planUsageDecision({
    isPremium: false,
    used,
    limit,
    increment: request.increment === true,
    usageKey: request.usage_key,
    usageKeyExists,
  });

  if (decision.shouldInsertEvent && request.usage_key) {
    const inserted = await insertUsageEvent(
      admin,
      scopeType,
      scopeId,
      request.action,
      request.usage_key,
      period
    );

    if (!inserted) {
      used = await getUsedCount(admin, scopeType, scopeId, request.action, period);
      decision = planUsageDecision({
        isPremium: false,
        used,
        limit,
        increment: true,
        usageKey: request.usage_key,
        usageKeyExists: true,
      });
      return buildCheckLimitsResponse(decision, resetAt);
    }
  }

  if (decision.shouldIncrementCounter) {
    used = await incrementUsageCounter(admin, scopeType, scopeId, request.action, period);
    decision = {
      ...decision,
      used,
    };
  }

  return buildCheckLimitsResponse(decision, resetAt);
}
