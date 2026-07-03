import { Linking } from 'react-native';
import type { Language } from '@/constants/i18n';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import { supabase } from '@/services/supabase';
import { LiveMessage } from '@/services/liveMediation';

export type AgreementResponsible = 'me' | 'partner' | 'both';

export interface AgreementItem {
  id: string;
  text: string;
  done: boolean;
  responsible: AgreementResponsible;
}

export interface NextStepItem {
  id: string;
  text: string;
  date: string;
}

export interface DateIdeaSummary {
  title: string;
  description: string;
  whyItFits: string;
  estimatedCost: string;
}

export interface MediationSummaryData {
  text?: string;
  commonUnderstanding?: string;
  agreements?: AgreementItem[];
  nextSteps?: NextStepItem[];
  doingWell?: string;
  mood?: string;
  hardestPart?: string;
  mediatorRating?: number;
  endedAt?: string;
  messageCount?: number;
  phase?: number;
  closureSurvey?: Record<string, string>;
  dateIdea?: DateIdeaSummary;
  closureCompletedAt?: string;
  mode?: 'solo' | 'live';
}

export function getResponsibleLabel(
  r: AgreementResponsible,
  lang: Language = 'pl'
): string {
  const labels = getLiveMediationExtras(lang).summary;
  if (r === 'me') return labels.responsibleMe;
  if (r === 'partner') return labels.responsiblePartner;
  return labels.responsibleBoth;
}

export function cycleResponsible(current: AgreementResponsible): AgreementResponsible {
  if (current === 'me') return 'partner';
  if (current === 'partner') return 'both';
  return 'me';
}

export function createAgreementId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function buildDefaultSummary(
  analysis: Record<string, unknown> | null,
  messageCount: number,
  phase: number
): MediationSummaryData {
  const bridge =
    (analysis?.bridgeStatement as string) ||
    (analysis?.common_ground as string) ||
    'Oboje troszczycie się o relację — to wspólna baza, od której możecie zacząć.';

  const doingWell =
    (analysis?.celebration as string) ||
    (analysis?.needsSummary as string) ||
    'Poświęciliście czas na rozmowę zamiast unikania — to już duży krok w stronę bliskości.';

  return {
    text: 'Dziękujemy za otwartą rozmowę. Każde wysłuchane uczucie to krok w stronę bliskości.',
    commonUnderstanding: bridge,
    agreements: [
      {
        id: createAgreementId(),
        text: 'Słuchamy siebie bez przerywania, gdy pojawi się trudny temat',
        done: false,
        responsible: 'both',
      },
      {
        id: createAgreementId(),
        text: 'Mówimy o uczuciach używając „ja czuję”, a nie „ty zawsze”',
        done: false,
        responsible: 'both',
      },
    ],
    nextSteps: [
      {
        id: createAgreementId(),
        text: 'Umówcie się na spokojną rozmowę kontrolną za tydzień',
        date: '',
      },
      {
        id: createAgreementId(),
        text: 'Każde z Was podzieli się jedną konkretną prośbą',
        date: '',
      },
    ],
    doingWell,
    endedAt: new Date().toISOString(),
    messageCount,
    phase,
  };
}

export async function fetchMediationForSummary(
  mediationId: string,
  userId: string
): Promise<{ live_summary: MediationSummaryData | null; analysis: Record<string, unknown> | null; status: string }> {
  const { data, error } = await supabase
    .from('mediations')
    .select('live_summary, analysis, status')
    .eq('id', mediationId)
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Nie znaleziono mediacji.');
  }

  return {
    live_summary: (data.live_summary as MediationSummaryData) || null,
    analysis: (data.analysis as Record<string, unknown>) || null,
    status: data.status,
  };
}

export function buildSummaryText(data: MediationSummaryData): string {
  const lines: string[] = [
    'PODSUMOWANIE MEDIACJI — MOST',
    '',
    'Udało Wam się porozmawiać!',
    '',
    'Wspólne zrozumienie:',
    data.commonUnderstanding || '—',
    '',
    'Wasze ustalenia:',
    ...(data.agreements?.length
      ? data.agreements.map(
          (a) =>
            `[${a.done ? 'x' : ' '}] ${a.text} (${getResponsibleLabel(a.responsible)})`
        )
      : ['—']),
    '',
    'Co zrobić dalej:',
    ...(data.nextSteps?.length
      ? data.nextSteps.map((s) => (s.date ? `• ${s.text} — ${s.date}` : `• ${s.text}`))
      : ['—']),
    '',
    'Co robicie dobrze:',
    data.doingWell || '—',
  ];

  if (data.mood) {
    lines.push('', `Nastrój po mediacji: ${data.mood}`);
  }
  if (data.hardestPart?.trim()) {
    lines.push('', `Co było najtrudniejsze: ${data.hardestPart.trim()}`);
  }
  if (data.mediatorRating) {
    lines.push('', `Ocena mediatora AI: ${data.mediatorRating}/5`);
  }

  return lines.join('\n');
}

export function resolveStatus(data: MediationSummaryData): 'resolved' | 'pending_agreements' {
  const agreements = data.agreements || [];
  if (agreements.length === 0) return 'resolved';
  const allDone = agreements.every((a) => a.done && a.text.trim().length > 0);
  return allDone ? 'resolved' : 'pending_agreements';
}

export async function saveMediationSummary(
  mediationId: string,
  data: MediationSummaryData
): Promise<'resolved' | 'pending_agreements'> {
  const status = resolveStatus(data);

  const { error } = await supabase
    .from('mediations')
    .update({
      live_summary: data,
      status,
      live_progress: 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId);

  if (error) {
    throw new Error(error.message || 'Nie udało się zapisać podsumowania.');
  }

  return status;
}

export async function sendSummaryEmail(
  email: string,
  subject: string,
  body: string
): Promise<void> {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('Nie udało się otworzyć klienta poczty.');
  }
  await Linking.openURL(url);
}

export function buildSummaryFromMessages(
  messages: LiveMessage[],
  analysis: Record<string, unknown> | null,
  phase: number
): MediationSummaryData {
  const userMessages = messages.filter(
    (m) => m.message_type === 'message' && m.sender_id !== 'ai'
  );
  return buildDefaultSummary(analysis, userMessages.length, phase);
}
