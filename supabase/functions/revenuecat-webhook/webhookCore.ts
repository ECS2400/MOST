/** RevenueCat webhook — testable core (no HTTP / Deno.serve). */

export const ENTITLEMENT_ID = 'MOST Pro';

export const PREMIUM_PRODUCT_IDS = new Set([
  'most_monthly',
  'most_yearly',
  'most_lifetime',
]);

export const SOLO_PRODUCT_ID = 'most_solo_analysis';

export const LIFETIME_PRODUCT_ID = 'most_lifetime';

export const ACTIVATING_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'TRANSFER',
]);

export const DEACTIVATING_EVENT_TYPES = new Set([
  'EXPIRATION',
  'CANCELLATION',
  'BILLING_ISSUE',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string | null;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
  period_type?: string | null;
}

export interface WebhookPayload {
  api_version?: string;
  event?: RevenueCatEvent;
}

export interface ProfileRow {
  id: string;
  couple_id?: string | null;
}

export interface CoupleRow {
  subscription_paid_by?: string | null;
}

export interface SupabaseAdminClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      };
    };
    insert(
      payload: Record<string, unknown>
    ): Promise<{ data: unknown; error: { code?: string } | null }>;
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ error: unknown }>;
    };
  };
}

export type PremiumState = 'premium' | 'free' | 'ignored';

export interface ProcessWebhookResult {
  ok: true;
  duplicate?: boolean;
  ignored?: boolean;
  reason?: string;
  premium?: boolean;
  userId?: string;
}

export function verifyWebhookAuthorization(
  authorizationHeader: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !authorizationHeader) return false;
  return authorizationHeader === `Bearer ${secret}`;
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseWebhookPayload(
  body: unknown
): { ok: true; event: RevenueCatEvent } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'INVALID_BODY' };
  }

  const event = (body as WebhookPayload).event;
  if (!event || typeof event !== 'object') {
    return { ok: false, error: 'MISSING_EVENT' };
  }

  if (!event.id || typeof event.id !== 'string') {
    return { ok: false, error: 'MISSING_EVENT_ID' };
  }
  if (!event.type || typeof event.type !== 'string') {
    return { ok: false, error: 'MISSING_EVENT_TYPE' };
  }
  if (!event.app_user_id || typeof event.app_user_id !== 'string') {
    return { ok: false, error: 'MISSING_APP_USER_ID' };
  }

  return {
    ok: true,
    event: {
      id: event.id,
      type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id ?? null,
      expiration_at_ms: event.expiration_at_ms ?? null,
      entitlement_ids: Array.isArray(event.entitlement_ids)
        ? event.entitlement_ids.filter((id): id is string => typeof id === 'string')
        : null,
      period_type: event.period_type ?? null,
    },
  };
}

export function hasPremiumEntitlement(event: RevenueCatEvent): boolean {
  const entitlementIds = event.entitlement_ids ?? [];
  if (entitlementIds.includes(ENTITLEMENT_ID)) return true;

  const productId = event.product_id ?? '';
  if (!productId || productId === SOLO_PRODUCT_ID) return false;
  return PREMIUM_PRODUCT_IDS.has(productId);
}

export function isSoloOnlyEvent(event: RevenueCatEvent): boolean {
  return event.product_id === SOLO_PRODUCT_ID && !hasPremiumEntitlement(event);
}

export function resolveExpirationIso(event: RevenueCatEvent): string | null {
  if (event.product_id === LIFETIME_PRODUCT_ID) return null;
  if (event.expiration_at_ms == null) return null;
  const parsed = new Date(event.expiration_at_ms);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function hasFutureExpiration(event: RevenueCatEvent, now: Date): boolean {
  if (event.product_id === LIFETIME_PRODUCT_ID) return true;
  if (event.expiration_at_ms == null) return false;
  return event.expiration_at_ms > now.getTime();
}

/** Determines whether the event should grant, revoke, or ignore premium sync. */
export function resolvePremiumState(
  event: RevenueCatEvent,
  now = new Date()
): PremiumState {
  if (isSoloOnlyEvent(event)) return 'ignored';

  const entitled = hasPremiumEntitlement(event);
  const futureExpiry = hasFutureExpiration(event, now);

  if (event.type === 'EXPIRATION') {
    return 'free';
  }

  if (event.type === 'CANCELLATION' || event.type === 'BILLING_ISSUE') {
    if (entitled && futureExpiry) return 'premium';
    return 'free';
  }

  if (ACTIVATING_EVENT_TYPES.has(event.type)) {
    if (!entitled) return 'ignored';
    if (event.product_id === LIFETIME_PRODUCT_ID) return 'premium';
    if (!futureExpiry && event.expiration_at_ms != null) return 'free';
    return 'premium';
  }

  if (DEACTIVATING_EVENT_TYPES.has(event.type)) {
    return 'free';
  }

  return 'ignored';
}

async function recordEvent(
  admin: SupabaseAdminClient,
  event: RevenueCatEvent
): Promise<'inserted' | 'duplicate'> {
  const { error } = await admin.from('revenuecat_events').insert({
    event_id: event.id,
    type: event.type,
    app_user_id: isValidUuid(event.app_user_id) ? event.app_user_id : null,
    product_id: event.product_id ?? null,
  });

  if (error?.code === '23505') return 'duplicate';
  if (error) throw new Error('EVENT_INSERT_FAILED');
  return 'inserted';
}

async function eventAlreadyProcessed(
  admin: SupabaseAdminClient,
  eventId: string
): Promise<boolean> {
  const { data } = await admin
    .from('revenuecat_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  return data != null;
}

export async function processRevenueCatWebhook(
  admin: SupabaseAdminClient,
  event: RevenueCatEvent,
  now = new Date()
): Promise<ProcessWebhookResult> {
  if (await eventAlreadyProcessed(admin, event.id)) {
    return { ok: true, duplicate: true };
  }

  if (!isValidUuid(event.app_user_id)) {
    return { ok: true, ignored: true, reason: 'NON_UUID_APP_USER_ID' };
  }

  const premiumState = resolvePremiumState(event, now);
  if (premiumState === 'ignored') {
    const recorded = await recordEvent(admin, event);
    if (recorded === 'duplicate') return { ok: true, duplicate: true };
    return { ok: true, ignored: true, reason: 'NOT_PREMIUM_EVENT' };
  }

  const userId = event.app_user_id;
  const isPremium = premiumState === 'premium';
  const expiresAt = isPremium ? resolveExpirationIso(event) : null;

  const { data: profileData, error: profileError } = await admin
    .from('profiles')
    .select('id, couple_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error('PROFILE_LOOKUP_FAILED');

  const profile = profileData as ProfileRow | null;
  if (!profile) {
    const recorded = await recordEvent(admin, event);
    if (recorded === 'duplicate') return { ok: true, duplicate: true };
    return { ok: true, ignored: true, reason: 'PROFILE_NOT_FOUND' };
  }

  const recorded = await recordEvent(admin, event);
  if (recorded === 'duplicate') return { ok: true, duplicate: true };

  const profileUpdate = await admin
    .from('profiles')
    .update({
      plan: isPremium ? 'premium' : 'free',
      plan_expires_at: expiresAt,
    })
    .eq('id', userId);

  if (profileUpdate.error) throw new Error('PROFILE_UPDATE_FAILED');

  if (profile.couple_id) {
    if (isPremium) {
      const coupleUpdate = await admin
        .from('couples')
        .update({
          subscription_tier: 'premium',
          subscription_paid_by: userId,
          subscription_expires: expiresAt,
        })
        .eq('id', profile.couple_id);

      if (coupleUpdate.error) throw new Error('COUPLE_UPDATE_FAILED');
    } else {
      const { data: coupleData } = await admin
        .from('couples')
        .select('subscription_paid_by')
        .eq('id', profile.couple_id)
        .maybeSingle();

      const couple = coupleData as CoupleRow | null;
      if (couple?.subscription_paid_by === userId) {
        const coupleUpdate = await admin
          .from('couples')
          .update({
            subscription_tier: 'free',
            subscription_expires: null,
          })
          .eq('id', profile.couple_id);

        if (coupleUpdate.error) throw new Error('COUPLE_UPDATE_FAILED');
      }
    }
  }

  return { ok: true, premium: isPremium, userId };
}
