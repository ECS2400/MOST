import { supabase } from '@/services/supabase';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

async function isFullyConnected(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, partner_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.couple_id || !profile.partner_id) {
    return false;
  }

  const { data: couple } = await supabase
    .from('couples')
    .select('partner_2_id')
    .eq('id', profile.couple_id)
    .maybeSingle();

  return !!couple?.partner_2_id;
}

async function ensurePendingCoupleRow(userId: string, inviteCode: string): Promise<void> {
  if (await isFullyConnected(userId)) {
    return;
  }

  const { data: pending } = await supabase
    .from('couples')
    .select('id, invite_code')
    .eq('partner_1_id', userId)
    .is('partner_2_id', null)
    .maybeSingle();

  if (pending) {
    if (pending.invite_code !== inviteCode) {
      await supabase
        .from('couples')
        .update({ invite_code: inviteCode })
        .eq('id', pending.id);
    }
    return;
  }

  await supabase.from('couples').insert({
    partner_1_id: userId,
    partner_2_id: null,
    invite_code: inviteCode,
  });
}

/** Returns the user's stable invite code from profiles (creates one if missing). */
export async function generateCoupleInviteCode(userId: string): Promise<string> {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('invite_code')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message || 'Nie udało się wczytać kodu zaproszenia.');
  }

  const existing = normalizeCode(profile?.invite_code);
  if (existing) {
    await ensurePendingCoupleRow(userId, existing);
    return existing;
  }

  const code = generateCode();
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ invite_code: code })
    .eq('id', userId);

  if (updateError) {
    throw new Error(updateError.message || 'Nie udało się zapisać kodu zaproszenia.');
  }

  await ensurePendingCoupleRow(userId, code);
  return code;
}

/** Optional rotation — replaces profile code and syncs pending couple row. */
export async function rotateCoupleInviteCode(userId: string): Promise<string> {
  const code = generateCode();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ invite_code: code })
    .eq('id', userId);

  if (updateError) {
    throw new Error(updateError.message || 'Nie udało się wygenerować nowego kodu.');
  }

  await ensurePendingCoupleRow(userId, code);
  return code;
}

export async function loadCoupleInviteCode(userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('invite_code')
    .eq('id', userId)
    .maybeSingle();

  return normalizeCode(profile?.invite_code);
}
