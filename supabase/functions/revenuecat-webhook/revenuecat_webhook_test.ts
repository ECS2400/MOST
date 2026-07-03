import { handleRevenueCatWebhookRequest } from './index.ts';
import {
  ENTITLEMENT_ID,
  LIFETIME_PRODUCT_ID,
  parseWebhookPayload,
  processRevenueCatWebhook,
  resolveExpirationIso,
  resolvePremiumState,
  SOLO_PRODUCT_ID,
  verifyWebhookAuthorization,
  hasPremiumEntitlement,
  type RevenueCatEvent,
  type SupabaseAdminClient,
} from './webhookCore.ts';
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COUPLE_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-06-15T12:00:00.000Z');
const FUTURE_MS = new Date('2026-12-31T23:59:59.000Z').getTime();
const PAST_MS = new Date('2025-01-01T00:00:00.000Z').getTime();

function baseEvent(overrides: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return {
    id: 'evt-1',
    type: 'INITIAL_PURCHASE',
    app_user_id: USER_ID,
    product_id: 'most_monthly',
    expiration_at_ms: FUTURE_MS,
    entitlement_ids: [ENTITLEMENT_ID],
    period_type: 'NORMAL',
    ...overrides,
  };
}

interface MockState {
  events: Set<string>;
  profiles: Map<string, { couple_id?: string | null; plan?: string; plan_expires_at?: string | null }>;
  couples: Map<string, { subscription_paid_by?: string | null; subscription_tier?: string; subscription_expires?: string | null }>;
}

function createMockAdmin(state: MockState): SupabaseAdminClient {
  return {
    from(table: string) {
      const filters: Record<string, string> = {};
      let updatePayload: Record<string, unknown> = {};

      const api = {
        select(_columns: string) {
          return api;
        },
        eq(column: string, value: string) {
          filters[column] = value;
          return api;
        },
        async maybeSingle() {
          if (table === 'revenuecat_events') {
            const exists = state.events.has(filters.event_id);
            return { data: exists ? { event_id: filters.event_id } : null, error: null };
          }
          if (table === 'profiles') {
            const profile = state.profiles.get(filters.id);
            return {
              data: profile ? { id: filters.id, couple_id: profile.couple_id ?? null } : null,
              error: null,
            };
          }
          if (table === 'couples') {
            const couple = state.couples.get(filters.id);
            return { data: couple ?? null, error: null };
          }
          return { data: null, error: null };
        },
        async insert(payload: Record<string, unknown>) {
          const eventId = String(payload.event_id);
          if (state.events.has(eventId)) {
            return { data: null, error: { code: '23505' } };
          }
          state.events.add(eventId);
          return { data: payload, error: null };
        },
        update(payload: Record<string, unknown>) {
          updatePayload = payload;
          return {
            async eq(column: string, value: string) {
              if (table === 'profiles') {
                const existing = state.profiles.get(value) ?? { couple_id: null };
                state.profiles.set(value, { ...existing, ...updatePayload });
              }
              if (table === 'couples') {
                const existing = state.couples.get(value) ?? {};
                state.couples.set(value, { ...existing, ...updatePayload });
              }
              return { error: null };
            },
          };
        },
      };

      return api;
    },
  };
}

function seedConnectedUser(state: MockState) {
  state.profiles.set(USER_ID, { couple_id: COUPLE_ID, plan: 'free', plan_expires_at: null });
  state.couples.set(COUPLE_ID, {
    subscription_tier: 'free',
    subscription_paid_by: null,
    subscription_expires: null,
  });
}

Deno.test('invalid secret → 401', async () => {
  const req = new Request('https://example.com/revenuecat-webhook', {
    method: 'POST',
    headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: baseEvent() }),
  });
  const res = await handleRevenueCatWebhookRequest(req, { webhookSecret: 'test-secret' });
  assertEquals(res.status, 401);
});

Deno.test('missing event → 400', () => {
  const parsed = parseWebhookPayload({});
  assertEquals(parsed.ok, false);
  if (!parsed.ok) assertEquals(parsed.error, 'MISSING_EVENT');
});

Deno.test('non-UUID app_user_id → ignored true', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  const admin = createMockAdmin(state);
  const result = await processRevenueCatWebhook(
    admin,
    baseEvent({ app_user_id: 'rc-anonymous-123' })
  );
  assertEquals(result, { ok: true, ignored: true, reason: 'NON_UUID_APP_USER_ID' });
  assertEquals(state.events.size, 0);
});

Deno.test('INITIAL_PURCHASE most_monthly → premium', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  const result = await processRevenueCatWebhook(
    admin,
    baseEvent({ type: 'INITIAL_PURCHASE', product_id: 'most_monthly' }),
    NOW
  );

  assertEquals(result.premium, true);
  assertEquals(state.profiles.get(USER_ID)?.plan, 'premium');
  assertEquals(state.couples.get(COUPLE_ID)?.subscription_tier, 'premium');
  assertEquals(state.couples.get(COUPLE_ID)?.subscription_paid_by, USER_ID);
});

Deno.test('RENEWAL most_yearly → premium', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  await processRevenueCatWebhook(
    admin,
    baseEvent({ id: 'evt-renewal', type: 'RENEWAL', product_id: 'most_yearly' }),
    NOW
  );

  assertEquals(state.profiles.get(USER_ID)?.plan, 'premium');
});

Deno.test('most_lifetime → premium no expiry', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  const event = baseEvent({
    id: 'evt-lifetime',
    product_id: LIFETIME_PRODUCT_ID,
    expiration_at_ms: null,
  });

  assertEquals(resolveExpirationIso(event), null);
  assertEquals(resolvePremiumState(event, NOW), 'premium');

  await processRevenueCatWebhook(admin, event, NOW);
  assertEquals(state.profiles.get(USER_ID)?.plan_expires_at, null);
  assertEquals(state.couples.get(COUPLE_ID)?.subscription_expires, null);
});

Deno.test('most_solo_analysis → ignored / no premium', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  const result = await processRevenueCatWebhook(
    admin,
    baseEvent({
      id: 'evt-solo',
      product_id: SOLO_PRODUCT_ID,
      entitlement_ids: [],
    }),
    NOW
  );

  assertEquals(result.ignored, true);
  assertEquals(state.profiles.get(USER_ID)?.plan, 'free');
  assertEquals(hasPremiumEntitlement(baseEvent({ product_id: SOLO_PRODUCT_ID, entitlement_ids: [] })), false);
});

Deno.test('EXPIRATION → free', async () => {
  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  state.profiles.set(USER_ID, { couple_id: COUPLE_ID, plan: 'premium', plan_expires_at: null });
  state.couples.set(COUPLE_ID, {
    subscription_tier: 'premium',
    subscription_paid_by: USER_ID,
    subscription_expires: null,
  });
  const admin = createMockAdmin(state);

  await processRevenueCatWebhook(
    admin,
    baseEvent({ id: 'evt-expire', type: 'EXPIRATION', expiration_at_ms: PAST_MS }),
    NOW
  );

  assertEquals(state.profiles.get(USER_ID)?.plan, 'free');
  assertEquals(state.couples.get(COUPLE_ID)?.subscription_tier, 'free');
  assertEquals(state.couples.get(COUPLE_ID)?.subscription_expires, null);
});

Deno.test('CANCELLATION with future expiry → premium until expiry', async () => {
  assertEquals(
    resolvePremiumState(
      baseEvent({ type: 'CANCELLATION', expiration_at_ms: FUTURE_MS }),
      NOW
    ),
    'premium'
  );

  const state: MockState = { events: new Set(), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  await processRevenueCatWebhook(
    admin,
    baseEvent({ id: 'evt-cancel', type: 'CANCELLATION', expiration_at_ms: FUTURE_MS }),
    NOW
  );

  assertEquals(state.profiles.get(USER_ID)?.plan, 'premium');
});

Deno.test('duplicate event ignored', async () => {
  const state: MockState = { events: new Set(['evt-dup']), profiles: new Map(), couples: new Map() };
  seedConnectedUser(state);
  const admin = createMockAdmin(state);

  const result = await processRevenueCatWebhook(
    admin,
    baseEvent({ id: 'evt-dup' }),
    NOW
  );

  assertEquals(result.duplicate, true);
  assertEquals(state.profiles.get(USER_ID)?.plan, 'free');
});

Deno.test('verifyWebhookAuthorization accepts bearer secret', () => {
  assertEquals(verifyWebhookAuthorization('Bearer abc', 'abc'), true);
  assertEquals(verifyWebhookAuthorization('Bearer abc', 'xyz'), false);
});
