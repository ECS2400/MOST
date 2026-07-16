import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribePostgresChanges } from '@/services/realtimeChannel';
import { supabase } from '@/services/supabase';
import { isPartnerNeedId, type PartnerNeedId } from '@/constants/partnerNeeds';

const LOCAL_KEY_PREFIX = 'most_partner_need';

export interface PartnerNeedSignal {
  userId: string;
  coupleId: string | null;
  needId: PartnerNeedId;
  updatedAt: string;
}

function localKey(userId: string): string {
  return `${LOCAL_KEY_PREFIX}_${userId}`;
}

function mapRow(row: Record<string, unknown>): PartnerNeedSignal | null {
  const needId = String(row.need_id || '');
  if (!isPartnerNeedId(needId)) return null;

  return {
    userId: String(row.user_id),
    coupleId: row.couple_id ? String(row.couple_id) : null,
    needId,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

async function loadLocal(userId: string): Promise<PartnerNeedSignal | null> {
  try {
    const raw = await AsyncStorage.getItem(localKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartnerNeedSignal;
    return parsed?.needId && isPartnerNeedId(parsed.needId) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveLocal(signal: PartnerNeedSignal): Promise<void> {
  await AsyncStorage.setItem(localKey(signal.userId), JSON.stringify(signal));
}

export async function fetchMyPartnerNeed(userId: string): Promise<PartnerNeedSignal | null> {
  try {
    const { data, error } = await supabase
      .from('partner_need_signals')
      .select('user_id, couple_id, need_id, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapRow(data);
      if (mapped) {
        await saveLocal(mapped);
        return mapped;
      }
    }
  } catch {
    // fallback below
  }

  return loadLocal(userId);
}

export async function fetchPartnerNeedSignal(
  coupleId: string,
  userId: string
): Promise<PartnerNeedSignal | null> {
  try {
    const { data, error } = await supabase
      .from('partner_need_signals')
      .select('user_id, couple_id, need_id, updated_at')
      .eq('couple_id', coupleId)
      .neq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return mapRow(data);
    }
  } catch {
    // brak synchronizacji
  }

  return null;
}

export async function saveMyPartnerNeed(
  userId: string,
  needId: PartnerNeedId,
  coupleId?: string | null
): Promise<PartnerNeedSignal> {
  const now = new Date().toISOString();
  const signal: PartnerNeedSignal = {
    userId,
    coupleId: coupleId || null,
    needId,
    updatedAt: now,
  };

  try {
    const { data, error } = await supabase
      .from('partner_need_signals')
      .upsert(
        {
          user_id: userId,
          couple_id: coupleId || null,
          need_id: needId,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select('user_id, couple_id, need_id, updated_at')
      .single();

    if (!error && data) {
      const mapped = mapRow(data);
      if (mapped) {
        await saveLocal(mapped);
        return mapped;
      }
    }
  } catch {
    // local fallback
  }

  await saveLocal(signal);
  return signal;
}

export function subscribePartnerNeeds(
  coupleId: string,
  onChange: () => void
): () => void {
  return subscribePostgresChanges(supabase, `partner-needs:dashboard:${coupleId}`, [
    {
      config: {
        event: '*',
        schema: 'public',
        table: 'partner_need_signals',
        filter: `couple_id=eq.${coupleId}`,
      },
      callback: () => onChange(),
    },
  ]);
}
