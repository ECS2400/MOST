import {
  buildCheckLimitsResponse,
  buildPremiumResponse,
  FREE_LIMITS,
  getResetAt,
  isCouplePremium,
  isProfilePremium,
  planUsageDecision,
  processCheckLimits,
  resolveIsPremium,
  resolveScope,
  validateRequestBody,
  type CheckLimitsRequest,
  type CouplePremiumRow,
  type ProfilePremiumRow,
} from './limitsCore.ts';
import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const RESET_AT = getResetAt(new Date('2026-06-15T12:00:00.000Z'));

function createMockAdmin(state: {
  used?: number;
  events?: Set<string>;
  feature?: string;
}) {
  const counters = new Map<string, number>();
  const events = state.events ?? new Set<string>();

  if (state.used != null && state.used > 0) {
    const feature = state.feature ?? 'create_dispute';
    if (feature === 'create_live_mediation') {
      counters.set(`couple:couple-1:${feature}:2026-06`, state.used);
    } else {
      counters.set(`user:user-1:${feature}:2026-06`, state.used);
    }
  }

  return {
    from(table: string) {
      const filters: Record<string, string> = {};
      const api = {
        select() {
          return api;
        },
        eq(column: string, value: string) {
          filters[column] = value;
          return api;
        },
        maybeSingle: async () => {
          if (table === 'usage_counters') {
            const key = `${filters.scope_type}:${filters.scope_id}:${filters.feature}:${filters.period}`;
            const used_count = counters.get(key) ?? 0;
            return {
              data: used_count > 0 ? { id: 'counter-1', used_count } : null,
              error: null,
            };
          }
          if (table === 'usage_events') {
            const key = `${filters.scope_type}:${filters.scope_id}:${filters.feature}:${filters.usage_key}:${filters.period}`;
            return { data: events.has(key) ? { id: 'event-1' } : null, error: null };
          }
          return { data: null, error: null };
        },
        insert(payload: Record<string, unknown>) {
          return {
            select() {
              return {
                maybeSingle: async () => {
                  if (table === 'usage_events') {
                    const key = `${payload.scope_type}:${payload.scope_id}:${payload.feature}:${payload.usage_key}:${payload.period}`;
                    if (events.has(key)) {
                      return { data: null, error: { code: '23505' } };
                    }
                    events.add(key);
                    return { data: { id: 'event-new' }, error: null };
                  }
                  return { data: null, error: null };
                },
                single: async () => {
                  if (table === 'usage_counters') {
                    const key = `${payload.scope_type}:${payload.scope_id}:${payload.feature}:${payload.period}`;
                    counters.set(key, 1);
                    return { data: { used_count: 1 }, error: null };
                  }
                  return { data: { used_count: 1 }, error: null };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq() {
              return {
                select() {
                  return {
                    single: async () => {
                      const key = `${filters.scope_type}:${filters.scope_id}:${filters.feature}:${filters.period}`;
                      const next = (counters.get(key) ?? 0) + 1;
                      counters.set(key, next);
                      return { data: { used_count: next }, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
      return api;
    },
    counters,
    events,
  };
}

Deno.test('Missing user_id → 400', () => {
  const result = validateRequestBody({ action: 'create_dispute' });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'MISSING_USER_ID');
    assertEquals(result.status, 400);
  }
});

Deno.test('Unknown action → 400', () => {
  const result = validateRequestBody({ user_id: 'user-1', action: 'unknown_action' });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, 'UNKNOWN_ACTION');
    assertEquals(result.status, 400);
  }
});

Deno.test('Free live mediation used=0 → allowed', async () => {
  const admin = createMockAdmin({ used: 0 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    couple_id: 'couple-1',
    action: 'create_live_mediation',
    increment: false,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    { subscription_tier: 'free', partner_1_id: 'user-1', partner_2_id: 'user-2' },
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, true);
  assertEquals(result.used, 0);
  assertEquals(result.limit, FREE_LIMITS.create_live_mediation.limit);
  assertEquals(result.reason, 'free_available');
});

Deno.test('Free live mediation used=1 → blocked', async () => {
  const admin = createMockAdmin({ used: 1, feature: 'create_live_mediation' });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    couple_id: 'couple-1',
    action: 'create_live_mediation',
    increment: false,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    { subscription_tier: 'free', partner_1_id: 'user-1', partner_2_id: 'user-2' },
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, false);
  assertEquals(result.used, 1);
  assertEquals(result.limit, 1);
  assertEquals(result.reason, 'limit_reached');
});

Deno.test('Premium profile → allowed unlimited', async () => {
  const admin = createMockAdmin({ used: 99 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    action: 'create_dispute',
    increment: true,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'premium', plan_expires_at: null },
    null,
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result, buildPremiumResponse(RESET_AT));
});

Deno.test('Premium couple → allowed unlimited', async () => {
  const admin = createMockAdmin({ used: 99 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    couple_id: 'couple-1',
    action: 'create_live_mediation',
    increment: true,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    {
      subscription_tier: 'premium',
      subscription_expires: '2027-01-01T00:00:00.000Z',
      partner_1_id: 'user-1',
      partner_2_id: 'user-2',
    },
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, true);
  assertEquals(result.isPremium, true);
  assertEquals(result.limit, null);
  assertEquals(result.reason, 'premium');
});

Deno.test('increment=false does not increase counter', async () => {
  const admin = createMockAdmin({ used: 0 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    action: 'create_dispute',
    increment: false,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    null,
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, true);
  assertEquals(result.used, 0);
  assertEquals(admin.counters.get('user:user-1:create_dispute:2026-06'), undefined);
});

Deno.test('increment=true increases counter', async () => {
  const admin = createMockAdmin({ used: 0 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    action: 'create_dispute',
    increment: true,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    null,
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, true);
  assertEquals(result.used, 1);
  assertEquals(admin.counters.get('user:user-1:create_dispute:2026-06'), 1);
});

Deno.test('usage_key does not count twice', async () => {
  const admin = createMockAdmin({ used: 1, feature: 'create_dispute' });
  admin.events.add('user:user-1:create_dispute:dispute-1:2026-06');

  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    action: 'create_dispute',
    increment: true,
    usage_key: 'dispute-1',
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    null,
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, true);
  assertEquals(result.used, 1);
  assertEquals(admin.counters.get('user:user-1:create_dispute:2026-06'), 1);
});

Deno.test('ai_chat free → blocked', async () => {
  const admin = createMockAdmin({ used: 0 });
  const request: CheckLimitsRequest = {
    user_id: 'user-1',
    action: 'ai_chat',
    increment: false,
  };

  const result = await processCheckLimits(
    admin as never,
    request,
    { plan: 'free' },
    null,
    new Date('2026-06-15T12:00:00.000Z')
  );

  assertEquals(result.allowed, false);
  assertEquals(result.used, 0);
  assertEquals(result.limit, 0);
  assertEquals(result.reason, 'limit_reached');
});

Deno.test('isProfilePremium respects expiry', () => {
  const profile: ProfilePremiumRow = {
    plan: 'premium',
    plan_expires_at: '2020-01-01T00:00:00.000Z',
  };
  assertEquals(isProfilePremium(profile, new Date('2026-01-01T00:00:00.000Z')), false);
});

Deno.test('isCouplePremium respects expiry', () => {
  const couple: CouplePremiumRow = {
    subscription_tier: 'premium',
    subscription_expires: '2020-01-01T00:00:00.000Z',
  };
  assertEquals(isCouplePremium(couple, new Date('2026-01-01T00:00:00.000Z')), false);
});

Deno.test('resolveIsPremium combines profile and couple', () => {
  assertEquals(
    resolveIsPremium({ plan: 'free' }, { subscription_tier: 'premium', subscription_expires: null }),
    true
  );
});

Deno.test('create_live_mediation requires couple scope', () => {
  assertThrows(() => resolveScope('create_live_mediation', 'user-1'), Error, 'COUPLE_ID_REQUIRED');
});

Deno.test('planUsageDecision blocks zero-limit features', () => {
  const decision = planUsageDecision({
    isPremium: false,
    used: 0,
    limit: 0,
    increment: false,
    usageKeyExists: false,
  });

  assertEquals(
    buildCheckLimitsResponse(decision, RESET_AT),
    {
      allowed: false,
      isPremium: false,
      used: 0,
      limit: 0,
      resetAt: RESET_AT,
      reason: 'limit_reached',
    }
  );
});
