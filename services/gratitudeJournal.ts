import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import type { Language } from '@/constants/i18n';
import { getTranslations } from '@/constants/i18n';

const LOCAL_KEY_PREFIX = 'most_gratitude_entries';

export interface GratitudeEntry {
  id: string;
  userId: string;
  coupleId?: string | null;
  entryDate: string;
  items: string[];
  shareWithPartner: boolean;
  createdAt: string;
  authorName?: string;
}

export interface GratitudeStreak {
  current: number;
  longest: number;
}

function localStorageKey(userId: string): string {
  return `${LOCAL_KEY_PREFIX}_${userId}`;
}

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapRow(row: Record<string, unknown>, authorName?: string): GratitudeEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    coupleId: (row.couple_id as string) || null,
    entryDate: row.entry_date as string,
    items: (row.items as string[]) || [],
    shareWithPartner: row.share_with_partner !== false,
    createdAt: row.created_at as string,
    authorName,
  };
}

async function loadLocalEntries(userId: string): Promise<GratitudeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(localStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as GratitudeEntry[];
  } catch {
    return [];
  }
}

async function saveLocalEntries(userId: string, entries: GratitudeEntry[]): Promise<void> {
  await AsyncStorage.setItem(localStorageKey(userId), JSON.stringify(entries));
}

export function calculateGratitudeStreak(entries: GratitudeEntry[]): GratitudeStreak {
  if (entries.length === 0) return { current: 0, longest: 0 };

  const dates = [...new Set(entries.map((e) => e.entryDate))].sort().reverse();
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86400000));

  let current = 0;
  if (dates[0] === today || dates[0] === yesterday) {
    let expect = dates[0] === today ? today : yesterday;
    for (const d of dates) {
      if (d === expect) {
        current += 1;
        const prev = new Date(expect);
        prev.setDate(prev.getDate() - 1);
        expect = localDateKey(prev);
      } else if (d < expect) {
        break;
      }
    }
  }

  let longest = 0;
  let run = 0;
  const asc = [...dates].sort();
  for (let i = 0; i < asc.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(asc[i - 1]);
      prev.setDate(prev.getDate() + 1);
      run = localDateKey(prev) === asc[i] ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current) };
}

export async function fetchMyGratitudeEntries(userId: string): Promise<GratitudeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(60);

    if (!error && data) {
      return data.map((row) => mapRow(row));
    }
  } catch {
    // fallback below
  }

  const local = await loadLocalEntries(userId);
  return local.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export async function fetchPartnerGratitudeEntries(
  coupleId: string,
  userId: string
): Promise<GratitudeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('share_with_partner', true)
      .neq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(30);

    if (!error && data) {
      return data.map((row) => mapRow(row));
    }
  } catch {
    // brak wpisów partnera w trybie offline
  }
  return [];
}

export async function saveGratitudeEntry(
  userId: string,
  items: string[],
  options: { coupleId?: string | null; shareWithPartner?: boolean; entryDate?: string }
): Promise<GratitudeEntry> {
  const trimmed = items.map((i) => i.trim()).filter(Boolean).slice(0, 3);
  if (trimmed.length === 0) {
    throw new Error('Wpisz przynajmniej jedną rzecz, za którą jesteś wdzięczny/a.');
  }

  const entryDate = options.entryDate || localDateKey();
  const shareWithPartner = options.shareWithPartner !== false;
  const coupleId = options.coupleId || null;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .upsert(
        {
          user_id: userId,
          couple_id: coupleId,
          entry_date: entryDate,
          items: trimmed,
          share_with_partner: shareWithPartner,
          updated_at: now,
        },
        { onConflict: 'user_id,entry_date' }
      )
      .select('*')
      .single();

    if (!error && data) {
      return mapRow(data);
    }
  } catch {
    // local fallback
  }

  const local = await loadLocalEntries(userId);
  const existingIdx = local.findIndex((e) => e.entryDate === entryDate);
  const entry: GratitudeEntry = {
    id: existingIdx >= 0 ? local[existingIdx].id : `local-${Date.now()}`,
    userId,
    coupleId,
    entryDate,
    items: trimmed,
    shareWithPartner,
    createdAt: existingIdx >= 0 ? local[existingIdx].createdAt : now,
  };

  if (existingIdx >= 0) {
    local[existingIdx] = entry;
  } else {
    local.unshift(entry);
  }
  await saveLocalEntries(userId, local);
  return entry;
}

export async function getTodayGratitudeEntry(userId: string): Promise<GratitudeEntry | null> {
  const today = localDateKey();
  const entries = await fetchMyGratitudeEntries(userId);
  return entries.find((e) => e.entryDate === today) || null;
}

const LOCALE_MAP: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

export function formatGratitudeDate(entryDate: string, lang: Language = 'pl'): string {
  const t = getTranslations(lang).gratitude;
  const d = new Date(entryDate + 'T12:00:00');
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  if (entryDate === today) return t.today;
  if (entryDate === yesterday) return t.yesterday;
  return d.toLocaleDateString(LOCALE_MAP[lang] ?? 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
