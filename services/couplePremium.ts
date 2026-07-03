import type { Couple, CoupleSubscriptionTier } from '@/types';
import { supabase } from '@/services/supabase';

export function isTimestampActive(
  value: string | null | undefined,
  now = new Date()
): boolean {
  if (!value) return true;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() > now.getTime();
}

export function mapCoupleSubscriptionFields(row: {
  subscription_tier?: string | null;
  subscription_expires?: string | null;
  subscription_paid_by?: string | null;
}): Pick<Couple, 'subscriptionTier' | 'subscriptionExpires' | 'subscriptionPaidBy'> {
  const tier = row.subscription_tier;
  let subscriptionTier: CoupleSubscriptionTier | null = null;
  if (tier === 'premium') subscriptionTier = 'premium';
  else if (tier === 'free') subscriptionTier = 'free';

  return {
    subscriptionTier,
    subscriptionExpires: row.subscription_expires ?? null,
    subscriptionPaidBy: row.subscription_paid_by ?? null,
  };
}

function isUserInCouple(couple: Couple, userId: string): boolean {
  return couple.user1Id === userId || couple.user2Id === userId;
}

function isPaidByCoupleMember(couple: Couple): boolean {
  if (!couple.subscriptionPaidBy) return false;
  return (
    couple.subscriptionPaidBy === couple.user1Id ||
    couple.subscriptionPaidBy === couple.user2Id
  );
}

/** True when the couple has an active shared premium subscription for this user. */
export function isCouplePremium(
  couple: Couple | null | undefined,
  userId: string | null | undefined,
  now = new Date()
): boolean {
  if (!couple || !userId) return false;
  if (!couple.user1Id || !couple.user2Id) return false;
  if (!isUserInCouple(couple, userId)) return false;
  if (couple.subscriptionTier !== 'premium') return false;
  if (!isTimestampActive(couple.subscriptionExpires, now)) return false;
  if (!isPaidByCoupleMember(couple)) return false;
  return true;
}

export interface SyncCouplePremiumInput {
  coupleId: string;
  paidByUserId: string;
  expiresAt?: string | null;
}

export async function syncCouplePremiumSubscription(
  input: SyncCouplePremiumInput
): Promise<void> {
  const { coupleId, paidByUserId, expiresAt } = input;

  const { error } = await supabase
    .from('couples')
    .update({
      subscription_tier: 'premium',
      subscription_paid_by: paidByUserId,
      subscription_expires: expiresAt ?? null,
    })
    .eq('id', coupleId);

  if (error) {
    throw new Error(error.message || 'Nie udało się zsynchronizować subskrypcji pary');
  }
}

export async function fetchCoupleSubscriptionFields(
  coupleId: string
): Promise<Pick<Couple, 'subscriptionTier' | 'subscriptionExpires' | 'subscriptionPaidBy'>> {
  const { data, error } = await supabase
    .from('couples')
    .select('subscription_tier, subscription_expires, subscription_paid_by')
    .eq('id', coupleId)
    .maybeSingle();

  if (error || !data) {
    return {
      subscriptionTier: null,
      subscriptionExpires: null,
      subscriptionPaidBy: null,
    };
  }

  return mapCoupleSubscriptionFields(data);
}
