import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { Language } from '@/constants/i18n';
import { getTranslations } from '@/constants/i18n';
import {
  AgreementItem,
  AgreementResponsible,
  getResponsibleLabel,
  MediationSummaryData,
} from '@/services/mediationSummary';
import { mediationHistoryTitle, MEDIATION_HISTORY_STATUSES } from '@/services/mediationStats';

const LOCAL_STATUS_KEY = 'most_agreement_status';
export const MANUAL_MEDIATION_ID = '__manual__';

export type AgreementArchiveStatus = 'active' | 'needs_refresh';

export interface ArchivedAgreement {
  id: string;
  mediationId: string;
  sourceAgreementId: string;
  text: string;
  responsible: AgreementResponsible;
  archiveStatus: AgreementArchiveStatus;
  mediationTitle: string;
  mediationDate: string;
  isSolo?: boolean;
  isManual?: boolean;
}

type LocalStatusMap = Record<string, AgreementArchiveStatus>;

function mediationIdForKey(mediationId: string | null | undefined): string {
  return mediationId || MANUAL_MEDIATION_ID;
}

function mapArchiveRow(
  row: Record<string, unknown>,
  localStatuses: LocalStatusMap,
  defaultMediationTitle: string
): ArchivedAgreement {
  const mediationId = mediationIdForKey(row.mediation_id as string | null);
  const sourceAgreementId = row.source_agreement_id as string;
  const isManual = !row.mediation_id;

  return {
    id: row.id as string,
    mediationId,
    sourceAgreementId,
    text: row.text as string,
    responsible: (row.responsible as AgreementResponsible) || 'both',
    archiveStatus:
      (row.archive_status as AgreementArchiveStatus) ||
      localStatuses[statusKey(mediationId, sourceAgreementId)] ||
      'active',
    mediationTitle: (row.mediation_title as string) || defaultMediationTitle,
    mediationDate: (row.mediation_date as string) || (row.created_at as string),
    isSolo: false,
    isManual,
  };
}

function statusKey(mediationId: string, sourceAgreementId: string): string {
  return `${mediationId}:${sourceAgreementId}`;
}

async function loadLocalStatuses(userId: string): Promise<LocalStatusMap> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_STATUS_KEY}_${userId}`);
    return raw ? (JSON.parse(raw) as LocalStatusMap) : {};
  } catch {
    return {};
  }
}

async function saveLocalStatus(
  userId: string,
  mediationId: string,
  sourceAgreementId: string,
  status: AgreementArchiveStatus
): Promise<void> {
  const map = await loadLocalStatuses(userId);
  map[statusKey(mediationId, sourceAgreementId)] = status;
  await AsyncStorage.setItem(`${LOCAL_STATUS_KEY}_${userId}`, JSON.stringify(map));
}

function extractAgreements(summary: MediationSummaryData | null): AgreementItem[] {
  if (!summary?.agreements?.length) return [];
  return summary.agreements.filter((a) => a.text?.trim());
}

export async function syncAgreementArchive(
  userId: string,
  coupleId?: string | null
): Promise<void> {
  const { data: mediations, error } = await supabase
    .from('mediations')
    .select('id, combined_description, created_at, live_summary, couple_id')
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .in('status', [...MEDIATION_HISTORY_STATUSES]);

  if (error) throw new Error(error.message);

  for (const med of mediations || []) {
    const summary = med.live_summary as MediationSummaryData | null;
    const agreements = extractAgreements(summary);
    if (agreements.length === 0) continue;

    const title = mediationHistoryTitle(med.combined_description || '');
    const medCoupleId = med.couple_id || coupleId || null;

    for (const agreement of agreements) {
      const { data: existing } = await supabase
        .from('agreement_archive')
        .select('id, archive_status')
        .eq('mediation_id', med.id)
        .eq('source_agreement_id', agreement.id)
        .maybeSingle();

      const payload = {
        user_id: userId,
        couple_id: medCoupleId,
        mediation_id: med.id,
        source_agreement_id: agreement.id,
        text: agreement.text.trim(),
        responsible: agreement.responsible || 'both',
        mediation_title: title,
        mediation_date: med.created_at,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('agreement_archive')
          .update(payload)
          .eq('id', existing.id);
        if (updateError?.message?.includes('agreement_archive')) return;
      } else {
        const { error: insertError } = await supabase.from('agreement_archive').insert({
          ...payload,
          archive_status: agreement.done ? 'active' : 'needs_refresh',
        });
        if (insertError?.message?.includes('agreement_archive')) return;
      }
    }
  }
}

export async function fetchArchivedAgreements(
  userId: string,
  coupleId?: string | null,
  language: Language = 'pl'
): Promise<ArchivedAgreement[]> {
  await syncAgreementArchive(userId, coupleId).catch(() => {});

  const defaultTitle = getTranslations(language).agreementsArchive.defaultMediationTitle;

  let query = supabase
    .from('agreement_archive')
    .select('*')
    .order('mediation_date', { ascending: false });

  if (coupleId) {
    query = query.or(`couple_id.eq.${coupleId},user_id.eq.${userId}`);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error?.message?.includes('agreement_archive') || error?.code === '42P01') {
    return fetchAgreementsFromMediationsLocal(userId, coupleId, language);
  }
  if (error) throw new Error(error.message);

  const localStatuses = await loadLocalStatuses(userId);

  return (data || []).map((row) => mapArchiveRow(row, localStatuses, defaultTitle));
}

export async function createManualAgreement(
  userId: string,
  coupleId: string | null,
  text: string,
  responsible: AgreementResponsible = 'both'
): Promise<ArchivedAgreement> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('EMPTY_TEXT');

  const sourceId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('agreement_archive')
    .insert({
      user_id: userId,
      couple_id: coupleId,
      mediation_id: null,
      source_agreement_id: sourceId,
      text: trimmed,
      responsible,
      archive_status: 'active',
      mediation_title: null,
      mediation_date: now,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id as string,
    mediationId: MANUAL_MEDIATION_ID,
    sourceAgreementId: sourceId,
    text: trimmed,
    responsible,
    archiveStatus: 'active',
    mediationTitle: '',
    mediationDate: now,
    isManual: true,
  };
}

async function fetchAgreementsFromMediationsLocal(
  userId: string,
  coupleId?: string | null,
  language: Language = 'pl'
): Promise<ArchivedAgreement[]> {
  const { data: mediations } = await supabase
    .from('mediations')
    .select('id, combined_description, created_at, live_summary, couple_id')
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .in('status', [...MEDIATION_HISTORY_STATUSES])
    .order('created_at', { ascending: false });

  const localStatuses = await loadLocalStatuses(userId);
  const items: ArchivedAgreement[] = [];

  for (const med of mediations || []) {
    const summary = med.live_summary as MediationSummaryData | null;
    const isSolo = summary?.mode === 'solo';
    for (const agreement of extractAgreements(summary)) {
      items.push({
        id: statusKey(med.id, agreement.id),
        mediationId: med.id,
        sourceAgreementId: agreement.id,
        text: agreement.text.trim(),
        responsible: agreement.responsible || 'both',
        archiveStatus:
          localStatuses[statusKey(med.id, agreement.id)] ||
          (agreement.done ? 'active' : 'needs_refresh'),
        mediationTitle: mediationHistoryTitle(med.combined_description || ''),
        mediationDate: med.created_at,
        isSolo,
      });
    }
  }

  return items;
}

export async function updateAgreementArchiveStatus(
  userId: string,
  item: Pick<ArchivedAgreement, 'id' | 'mediationId' | 'sourceAgreementId'>,
  status: AgreementArchiveStatus
): Promise<void> {
  if (!item.id.includes(':')) {
    const { error } = await supabase
      .from('agreement_archive')
      .update({ archive_status: status, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error && !error.message.includes('agreement_archive')) {
      throw new Error(error.message);
    }
  }

  await saveLocalStatus(userId, item.mediationId, item.sourceAgreementId, status);
}

export function formatAgreementsForAiContext(
  agreements: ArchivedAgreement[],
  language: Language = 'pl'
): string {
  const aa = getTranslations(language).agreementsArchive;
  const active = agreements.filter((a) => a.archiveStatus === 'active');
  const refresh = agreements.filter((a) => a.archiveStatus === 'needs_refresh');

  const lines: string[] = [];

  if (active.length) {
    lines.push(aa.aiActiveHeader);
    active.slice(0, 12).forEach((a) => {
      lines.push(`- ${a.text} (${getResponsibleLabel(a.responsible, language)})`);
    });
  }

  if (refresh.length) {
    lines.push('', aa.aiRefreshHeader);
    refresh.slice(0, 8).forEach((a) => {
      lines.push(`- ${a.text}`);
    });
  }

  return lines.join('\n').trim();
}

export async function fetchPriorAgreementsContext(
  userId: string,
  coupleId?: string | null,
  language: Language = 'pl'
): Promise<string> {
  try {
    const agreements = await fetchArchivedAgreements(userId, coupleId, language);
    if (!agreements.length) return '';
    return formatAgreementsForAiContext(agreements, language);
  } catch {
    return '';
  }
}
