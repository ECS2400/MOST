import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@/constants/i18n';
import { callEdge, EDGE } from '@/services/supabase';

export const MAX_REMINDERS_PER_DAY = 5;
export const REMINDER_REPEAT_COOLDOWN_DAYS = 5;

interface ReminderHistoryEntry {
  text: string;
  shownAt: string;
}

interface ReminderStore {
  date: string;
  fetchCount: number;
  currentTip: string | null;
  history: ReminderHistoryEntry[];
}

function storageKey(userId: string): string {
  return `most_relationship_reminders_${userId}`;
}

function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysSince(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  then.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
}

function emptyStore(): ReminderStore {
  return { date: localDateKey(), fetchCount: 0, currentTip: null, history: [] };
}

async function loadStore(userId: string): Promise<ReminderStore> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as ReminderStore;
    const today = localDateKey();
    if (parsed.date !== today) {
      return { ...parsed, date: today, fetchCount: 0, currentTip: null };
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function saveStore(userId: string, store: ReminderStore): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(store));
}

function tipsToAvoid(history: ReminderHistoryEntry[]): string[] {
  return history.filter((h) => daysSince(h.shownAt) < REMINDER_REPEAT_COOLDOWN_DAYS).map((h) => h.text);
}

export interface ReminderFetchResult {
  tip: string | null;
  fetchCount: number;
  remaining: number;
  limitReached: boolean;
  source?: string;
}

export async function fetchRelationshipReminder(params: {
  userId: string;
  language: Language;
  partnerName?: string | null;
  forceNew?: boolean;
}): Promise<ReminderFetchResult> {
  const store = await loadStore(params.userId);
  const remaining = Math.max(0, MAX_REMINDERS_PER_DAY - store.fetchCount);

  if (!params.forceNew && store.currentTip && remaining >= 0) {
    return {
      tip: store.currentTip,
      fetchCount: store.fetchCount,
      remaining,
      limitReached: remaining === 0 && store.fetchCount >= MAX_REMINDERS_PER_DAY,
    };
  }

  if (store.fetchCount >= MAX_REMINDERS_PER_DAY) {
    return {
      tip: store.currentTip,
      fetchCount: store.fetchCount,
      remaining: 0,
      limitReached: true,
    };
  }

  const avoidTips = tipsToAvoid(store.history);

  try {
    const result = await callEdge<{ tip?: string; source?: string }>(EDGE.relationshipReminder, {
      language: params.language,
      partnerName: params.partnerName || undefined,
      avoidTips,
    });

    const tip = result.tip?.trim();
    if (!tip) throw new Error('Empty tip');

    const now = new Date().toISOString();
    const next: ReminderStore = {
      date: store.date,
      fetchCount: store.fetchCount + 1,
      currentTip: tip,
      history: [{ text: tip, shownAt: now }, ...store.history].slice(0, 40),
    };
    await saveStore(params.userId, next);

    return {
      tip,
      fetchCount: next.fetchCount,
      remaining: Math.max(0, MAX_REMINDERS_PER_DAY - next.fetchCount),
      limitReached: next.fetchCount >= MAX_REMINDERS_PER_DAY,
      source: result.source,
    };
  } catch {
    return {
      tip: store.currentTip,
      fetchCount: store.fetchCount,
      remaining,
      limitReached: store.fetchCount >= MAX_REMINDERS_PER_DAY,
    };
  }
}
