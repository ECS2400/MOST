import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'most_recent_date_ideas_';
import { MAX_RECENT_DATE_IDEAS } from '@/constants/dateIdeas/pickerLogic';

const MAX_RECENT = MAX_RECENT_DATE_IDEAS;

function storageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId?.trim() || 'guest'}`;
}

export async function loadRecentDateIdeaIds(userId?: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function saveRecentDateIdeaIds(ids: string[], userId?: string): Promise<void> {
  const trimmed = ids.slice(-MAX_RECENT);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
}

export async function appendRecentDateIdeaId(id: string, userId?: string): Promise<string[]> {
  const existing = await loadRecentDateIdeaIds(userId);
  const next = [...existing.filter((entry) => entry !== id), id].slice(-MAX_RECENT);
  await saveRecentDateIdeaIds(next, userId);
  return next;
}

export { MAX_RECENT };
