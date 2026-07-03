import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

import { Language } from '@/constants/i18n';

const LOCAL_KEY_PREFIX = 'most_relationship';

const DATE_LOCALE: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

export interface RelationshipAnniversary {
  id: string;
  label: string;
  date: string;
}

export interface RelationshipData {
  startDate: string | null;
  anniversaries: RelationshipAnniversary[];
}

function localKey(userId: string): string {
  return `${LOCAL_KEY_PREFIX}_${userId}`;
}

export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

export function formatDatePl(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function formatRelationshipDate(isoDate: string, lang: Language = 'pl'): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return formatDatePl(isoDate);
  return parsed.toLocaleDateString(DATE_LOCALE[lang] || 'pl-PL', {
    day: 'numeric',
    month: '2-digit',
    year: 'numeric',
  });
}

export function daysTogether(startDate: string, from = new Date()): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(from);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - start.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / 86400000) + 1;
}

export function daysUntilNextOccurrence(dateStr: string, from = new Date()): number {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const [, m, d] = dateStr.split('-').map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
  }
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

export function getNextMilestone(
  startDate: string | null,
  anniversaries: RelationshipAnniversary[],
  defaultAnniversaryLabel = 'Rocznica związku'
): { label: string; daysUntil: number } | null {
  const candidates: { label: string; daysUntil: number }[] = [];

  if (startDate) {
    candidates.push({
      label: defaultAnniversaryLabel,
      daysUntil: daysUntilNextOccurrence(startDate),
    });
  }

  for (const a of anniversaries) {
    if (!a.date) continue;
    candidates.push({
      label: a.label,
      daysUntil: daysUntilNextOccurrence(a.date),
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.daysUntil - b.daysUntil);
  return candidates[0];
}

async function loadLocal(userId: string): Promise<RelationshipData> {
  try {
    const raw = await AsyncStorage.getItem(localKey(userId));
    if (!raw) return { startDate: null, anniversaries: [] };
    return JSON.parse(raw) as RelationshipData;
  } catch {
    return { startDate: null, anniversaries: [] };
  }
}

async function saveLocal(userId: string, data: RelationshipData): Promise<void> {
  await AsyncStorage.setItem(localKey(userId), JSON.stringify(data));
}

function mapCoupleRow(row: Record<string, unknown>): RelationshipData {
  const anniversaries = Array.isArray(row.anniversaries)
    ? (row.anniversaries as RelationshipAnniversary[])
    : [];
  return {
    startDate: (row.relationship_start_date as string) || null,
    anniversaries,
  };
}

function isEmptyData(data: RelationshipData): boolean {
  return !data.startDate && (!data.anniversaries || data.anniversaries.length === 0);
}

function mergeRelationshipData(
  remote: RelationshipData,
  local: RelationshipData
): RelationshipData {
  return {
    startDate: remote.startDate ?? local.startDate ?? null,
    anniversaries:
      remote.anniversaries && remote.anniversaries.length > 0
        ? remote.anniversaries
        : local.anniversaries || [],
  };
}

export async function fetchRelationshipData(
  userId: string,
  coupleId?: string | null
): Promise<RelationshipData> {
  const local = await loadLocal(userId);

  if (coupleId) {
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('relationship_start_date, anniversaries')
        .eq('id', coupleId)
        .maybeSingle();

      if (!error && data) {
        const remote = mapCoupleRow(data as Record<string, unknown>);
        const merged = mergeRelationshipData(remote, local);

        // Jeśli baza jest pusta, a lokalnie mamy datę — uzupełnij współdzielony rekord,
        // żeby partner też ją zobaczył i nie znikała po kolejnym logowaniu.
        if (isEmptyData(remote) && !isEmptyData(local)) {
          await supabase
            .from('couples')
            .update({
              relationship_start_date: merged.startDate,
              anniversaries: merged.anniversaries,
            })
            .eq('id', coupleId)
            .then(undefined, () => undefined);
        }

        await saveLocal(userId, merged);
        return merged;
      }
    } catch {
      // fallback to local
    }
  }
  return local;
}

export async function saveRelationshipData(
  userId: string,
  coupleId: string | null | undefined,
  data: RelationshipData
): Promise<void> {
  // Zawsze cache lokalny natychmiast — żeby data nie znikała nawet gdy sieć/baza zawiedzie.
  await saveLocal(userId, data);

  if (!coupleId) return;

  const { error } = await supabase
    .from('couples')
    .update({
      relationship_start_date: data.startDate,
      anniversaries: data.anniversaries,
    })
    .eq('id', coupleId);

  if (error) {
    // Kolumny mogą jeszcze nie istnieć w bazie — nie blokuj UX, dane są lokalnie.
    const missingColumns =
      error.message.includes('relationship_start_date') ||
      error.message.includes('anniversaries') ||
      error.code === '42703';
    if (!missingColumns) {
      throw new Error(error.message);
    }
  }
}

export function newAnniversaryId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
