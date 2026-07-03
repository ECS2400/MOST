import { supabase } from '@/services/supabase';
import type { Language } from '@/constants/i18n';
import { getTranslations } from '@/constants/i18n';

export type MediationStats = {
  total: number;
  resolved: number;
  active: number;
};

export const MEDIATION_HISTORY_STATUSES = [
  'analyzing',
  'inviting',
  'live',
  'resolved',
  'cancelled',
  'completed',
  'pending_agreements',
] as const;

export const MEDIATION_ACTIVE_STATUSES = ['analyzing', 'inviting', 'live', 'completed', 'pending_agreements'] as const;

export type MediationHistoryItem = {
  id: string;
  status: string;
  combinedDescription: string;
  createdAt: string;
  isSolo?: boolean;
};

export async function fetchMediationStats(userId: string): Promise<MediationStats> {
  const { data, error } = await supabase
    .from('mediations')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', [...MEDIATION_HISTORY_STATUSES]);

  if (error) throw error;

  const rows = data || [];
  const activeSet = new Set<string>(MEDIATION_ACTIVE_STATUSES);

  return {
    total: rows.length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
    active: rows.filter((r) => activeSet.has(r.status)).length,
  };
}

export async function fetchMediationHistory(userId: string): Promise<MediationHistoryItem[]> {
  const { data, error } = await supabase
    .from('mediations')
    .select('id, status, combined_description, created_at, live_summary')
    .eq('user_id', userId)
    .in('status', [...MEDIATION_HISTORY_STATUSES])
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    status: row.status,
    combinedDescription: row.combined_description || '',
    createdAt: row.created_at,
    isSolo: (row.live_summary as { mode?: string } | null)?.mode === 'solo',
  }));
}

export function mediationHistoryTitle(description: string, lang: Language = 'pl'): string {
  const trimmed = description.trim();
  if (!trimmed) return getTranslations(lang).mediationHistory.defaultTitle;
  const firstLine = trimmed.split('\n')[0]?.trim() || trimmed;
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

export function mediationStatusLabel(
  status: string,
  lang: Language = 'pl',
  isSolo = false
): string {
  const s = getTranslations(lang).mediationHistory.statuses;
  if (isSolo && status === 'resolved') return s.soloCoach;
  if (isSolo && status === 'completed') return s.soloCoachActive;
  switch (status) {
    case 'analyzing':
      return s.analyzing;
    case 'completed':
      return s.completed;
    case 'inviting':
      return s.inviting;
    case 'live':
      return s.live;
    case 'pending_agreements':
      return s.pending_agreements;
    case 'resolved':
      return s.resolved;
    case 'cancelled':
      return s.cancelled;
    default:
      return status;
  }
}

export function mediationStatusColor(status: string): string {
  switch (status) {
    case 'resolved':
      return '#22C55E';
    case 'cancelled':
      return '#94A3B8';
    case 'live':
      return '#F59E0B';
    case 'inviting':
      return '#A855F7';
    case 'analyzing':
    case 'completed':
      return '#6366F1';
    case 'pending_agreements':
      return '#14B8A6';
    default:
      return '#6366F1';
  }
}

export function mediationHistoryRoute(
  mediationId: string,
  status: string
): { pathname: string; params: { mediationId: string } } {
  switch (status) {
    case 'inviting':
      return { pathname: '/mediation/invite', params: { mediationId } };
    case 'live':
      return { pathname: '/mediation/live', params: { mediationId } };
    case 'resolved':
    case 'pending_agreements':
      return { pathname: '/mediation/summary', params: { mediationId } };
    case 'cancelled':
      return { pathname: '/mediation/analysis', params: { mediationId } };
    case 'analyzing':
    case 'completed':
    default:
      return { pathname: '/mediation/analysis', params: { mediationId } };
  }
}
