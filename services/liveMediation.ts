import {
  isHistoricalConversationStateMessage,
  isBrokenHistoricalConversationStateMessage,
} from '@/legacyMigration/historyFilters';
import {
  getSupabaseRequestHeaders,
  prepareSupabaseRequest,
  supabase,
} from '@/services/supabase';
import type { Language } from '@/constants/i18n';
import { normalizeAppLanguage } from '@/constants/i18n';
import { getLiveMediationExtras } from '@/constants/i18n/liveMediation';
import {
  buildAlternativeProposalMessage as i18nAlternativeProposal,
  buildOpeningFirstQuestion,
  buildProposalAcceptedFinalMessage as i18nProposalAccepted,
  formatOpeningSummary,
  partnerBDefaultLabel,
} from '@/services/liveMediationI18n';
import { fmt } from '@/utils/i18nFormat';
import { looksLikePolishCoachText } from '@/utils/textTruncate';
import {
  callMediatorRuntime,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
import {
  buildLiveRuntimeTurnInput,
  logMediatorRuntimeRolloutFailure,
  routeLiveMediatorTurn,
  toRuntimeLanguage,
} from '@/services/mediatorRuntimeClient/liveMediationBridge';
import {
  buildMediationRuntimePersistencePatch,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { loadMediationRuntimeState } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { buildLiveTranscriptWindow } from '@/services/mediatorRuntimeClient/buildLiveTranscriptWindow';
import { resolveRuntimeClientEventsForTurn } from '@/services/mediatorRuntimeClient/resolveRuntimeClientEventsForTurn';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import {
  hasMediatorOpeningDelivered,
  shouldSkipOpeningBootstrap as shouldSkipOpeningBootstrapGuard,
} from '@/services/mediatorRuntimeClient/openingBootstrapGuards';
import type { MediatorRuntimeParsedSuccess } from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
import {
  buildBootstrapMediationStateFromContext,
} from '@/services/mediatorRuntimeClient/mapMediationContextToBootstrapState';
import type { RuntimeClientEvent } from '@/types/mediator';
import type {
  LiveMediatorResponse,
  LiveQuestionPhase,
  LiveSessionFlow,
  LiveSessionStage,
  MediatorMode,
  PrivateHint,
  QuestionTarget,
} from '@/services/liveMediation.types';

function liveStrings(lang: Language = 'pl') {
  return getLiveMediationExtras(lang).service;
}

export interface LiveMessage {
  id: string;
  mediation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  message_type: 'message' | 'question' | 'hint' | 'system' | 'summary' | 'fun_fact';
  is_private: boolean;
  recipient_id: string | null;
  phase: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type {
  LiveMediatorResponse,
  LiveQuestionPhase,
  LiveSessionFlow,
  LiveSessionStage,
  MediatorMode,
  PrivateHint,
  QuestionTarget,
} from '@/services/liveMediation.types';

export interface FetchMessagesResult {
  messages: LiveMessage[];
  error: string | null;
}

export interface FetchLiveMessagesOptions {
  force?: boolean;
}

const liveMessagesCache = new Map<string, LiveMessage[]>();

export function invalidateLiveMessagesCache(mediationId?: string): void {
  if (mediationId) {
    liveMessagesCache.delete(mediationId);
    return;
  }
  liveMessagesCache.clear();
}

export function isEphemeralMessageId(id: string): boolean {
  return (
    id.startsWith('local-') ||
    id.startsWith('sim-') ||
    id.startsWith('mock-') ||
    id.startsWith('local-ai-')
  );
}

/** Composite key: mediation + sender + content + minute — prevents exact duplicates. */
export function messageDedupeKey(
  message: Pick<LiveMessage, 'mediation_id' | 'sender_id' | 'content' | 'created_at'>
): string {
  const minute = new Date(message.created_at).toISOString().slice(0, 16);
  const content = typeof message.content === 'string' ? message.content : String(message.content ?? '');
  return `${message.mediation_id}|${message.sender_id}|${content}|${minute}`;
}

function coerceMediatorText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function isValidOutgoingChatContent(content: string): boolean {
  return typeof content === 'string' && content.trim().length > 0;
}

function normalizeMediatorResponseText(response: LiveMediatorResponse): LiveMediatorResponse {
  const publicMessage = coerceMediatorText(response.publicMessage);
  const aiQuestion = coerceMediatorText(response.aiQuestion);
  return {
    ...response,
    publicMessage: publicMessage || undefined,
    aiQuestion: aiQuestion || undefined,
    phaseTransition: coerceMediatorText(response.phaseTransition) || undefined,
    escalationMessage: coerceMediatorText(response.escalationMessage) || undefined,
    funFact: coerceMediatorText(response.funFact) || undefined,
  };
}

export function filterValidLiveAiMessages(messages: LiveMessage[]): LiveMessage[] {
  return messages.filter((m) => {
    if (!m || typeof m.id !== 'string' || typeof m.message_type !== 'string') return false;
    if (isHistoricalConversationStateMessage(m)) return false;
    return (
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      typeof m.sender_id === 'string'
    );
  });
}

/** Test helper — throws if opening_summary local messages are malformed. */
export function assertOpeningLiveMessages(messages: LiveMessage[]): void {
  const chatMessages = messages.filter((m) => !isHistoricalConversationStateMessage(m));
  const summaries = chatMessages.filter(
    (m) => m.message_type === 'summary' && m.metadata?.summaryKind === 'opening_summary'
  );
  const questions = chatMessages.filter((m) => m.message_type === 'question');
  if (summaries.length !== 1) {
    throw new Error(`Expected 1 opening summary message, got ${summaries.length}`);
  }
  if (questions.length !== 1) {
    throw new Error(`Expected 1 opening question message, got ${questions.length}`);
  }
  const ids = new Set(messages.map((m) => m.id));
  if (ids.size !== messages.length) {
    throw new Error('Opening live messages contain duplicate ids');
  }
  for (const m of [...summaries, ...questions]) {
    if (!isValidOutgoingChatContent(m.content)) {
      throw new Error(`Opening message ${m.id} has invalid content`);
    }
    if (m.message_type === 'summary' && m.sender_id !== 'ai') {
      throw new Error(`Opening summary must have sender_id ai, got ${m.sender_id}`);
    }
    if (m.message_type === 'question' && m.sender_id !== 'ai') {
      throw new Error(`Opening question must have sender_id ai, got ${m.sender_id}`);
    }
  }
  const stateRows = messages.filter((m) => isHistoricalConversationStateMessage(m));
  if (stateRows.length > 0 && stateRows.some((m) => isBrokenHistoricalConversationStateMessage(m))) {
    throw new Error('Conversation state row missing state payload');
  }
}

export function dedupeLiveMessages(messages: LiveMessage[]): LiveMessage[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: LiveMessage[] = [];

  for (const m of sorted) {
    if (seenIds.has(m.id)) continue;
    const key = messageDedupeKey(m);
    if (seenKeys.has(key)) continue;
    seenIds.add(m.id);
    seenKeys.add(key);
    result.push(m);
  }
  return result;
}

export function appendLiveMessage(
  existing: LiveMessage[],
  incoming: LiveMessage
): LiveMessage[] {
  if (existing.some((m) => m.id === incoming.id)) return existing;

  const incomingKey = messageDedupeKey(incoming);
  if (existing.some((m) => messageDedupeKey(m) === incomingKey)) return existing;

  const withoutEphemeralDupes = existing.filter(
    (m) =>
      !(
        isEphemeralMessageId(m.id) &&
        m.sender_id === incoming.sender_id &&
        m.content === incoming.content
      )
  );

  return dedupeLiveMessages([...withoutEphemeralDupes, incoming]);
}

async function fetchRecentAiMessages(
  mediationId: string,
  withinSeconds = 30
): Promise<LiveMessage[]> {
  const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
  await liveMessagesHeaders();
  const { data } = await supabase
    .from('live_messages')
    .select('*')
    .eq('mediation_id', mediationId)
    .eq('sender_id', 'ai')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  return (data || []).map(mapMessage);
}

function isRecentAiDuplicate(
  row: { content: string },
  recentAi: LiveMessage[]
): boolean {
  return recentAi.some((m) => m.sender_id === 'ai' && m.content === row.content);
}

/** Tracks AI message content already persisted this session (cleared on session start). */
const sentAiContentByMediation = new Map<string, Set<string>>();

export function clearSentAiMessagesRef(mediationId: string): void {
  sentAiContentByMediation.set(mediationId, new Set());
}

function getSentAiContentSet(
  mediationId: string,
  externalRef?: Set<string>
): Set<string> {
  if (externalRef) return externalRef;
  if (!sentAiContentByMediation.has(mediationId)) {
    sentAiContentByMediation.set(mediationId, new Set());
  }
  return sentAiContentByMediation.get(mediationId)!;
}

export const LIVE_QUESTIONS_TARGET = 15;
export const LIVE_EXTENSION_QUESTIONS = 5;
export const READY_NEXT_ACTION = 'ready_next_question';
export const SESSION_DECISION_ACTION = 'session_decision';
export const PROPOSAL_DECISION_ACTION = 'proposal_decision';
export const ALTERNATIVE_SOLUTION_KIND = 'alternative_solution';
export const PROPOSAL_ACCEPTED_FINAL_KIND = 'proposal_accepted_final';
export const EXTENSION_START_ACTION = 'extension_start';
export const GENERATION_LOCK_ACTION = 'generation_lock';
export type ParticipantNames = { hostName?: string; partnerName?: string };

const activeGenerationKeys = new Set<string>();

function generationKey(mediationId: string, questionId: string): string {
  return `${mediationId}::${questionId}`;
}

/** Blokada w pamięci procesu — chroni przed podwójnym generowaniem (np. Strict Mode). */
export function tryBeginGeneration(mediationId: string, questionId: string): boolean {
  const key = generationKey(mediationId, questionId);
  if (activeGenerationKeys.has(key)) return false;
  activeGenerationKeys.add(key);
  return true;
}

export function endGeneration(mediationId: string, questionId: string): void {
  activeGenerationKeys.delete(generationKey(mediationId, questionId));
}

export async function signalGenerationLock(
  mediationId: string,
  userId: string,
  userName: string,
  questionId: string,
  phase: number
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: '',
      message_type: 'system',
      is_private: false,
      phase,
      metadata: {
        action: GENERATION_LOCK_ACTION,
        userId,
        questionId,
      },
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      id: `local-gen-lock-${userId}-${questionId}`,
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: '',
      message_type: 'system',
      is_private: false,
      recipient_id: null,
      phase,
      metadata: { action: GENERATION_LOCK_ACTION, userId, questionId },
      created_at: new Date().toISOString(),
    };
  }

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  return saved;
}

export interface LiveTurnState {
  lastQuestion: LiveMessage | null;
  questionNumber: number;
  hostAnswered: boolean;
  partnerAnswered: boolean;
  hostReady: boolean;
  partnerReady: boolean;
  bothAnswered: boolean;
  bothReady: boolean;
  midSummaryShown: boolean;
  endCheckShown: boolean;
  finalSummaryShown: boolean;
  extensionCheckShown: boolean;
  proposedSolutionShown: boolean;
}

export interface LiveSession {
  id: string;
  user_id: string;
  partner_id: string | null;
  live_phase: number;
  live_paused: boolean;
  live_progress: number;
  current_question: string | null;
  current_question_index?: number;
  partner_typing: boolean;
  status: string;
}

export const SIMULATED_PARTNER_ID = 'simulated-partner';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidPartnerUserId(partnerUserId?: string | null): boolean {
  return !!partnerUserId && partnerUserId !== SIMULATED_PARTNER_ID && UUID_RE.test(partnerUserId);
}

function questionFlow(lang: Language = 'pl'): string[] {
  return [...liveStrings(lang).questionFlow];
}

export function getLastQuestionMessage(messages: LiveMessage[]): LiveMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.message_type === 'question' && message.sender_id === 'ai') {
      return message;
    }
  }
  return null;
}

/** Ostatni punkt w flow: pytanie lub podsumowanie AI — od niego liczymy odpowiedzi i gotowość. */
export function getLastCheckpointMessage(messages: LiveMessage[]): LiveMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.message_type === 'question') return m;
    if (m.message_type === 'summary') return m;
    if (
      m.sender_id === 'ai' &&
      m.message_type === 'system' &&
      (m.metadata?.summaryKind === 'mid_summary' || m.metadata?.summaryKind === 'end_check')
    ) {
      return m;
    }
  }
  return null;
}

export function countAskedQuestions(messages: LiveMessage[]): number {
  return messages.filter((m) => m.message_type === 'question' && m.sender_id === 'ai').length;
}

export function extractQuestionBare(content: string): string {
  const text = typeof content === 'string' ? content : String(content ?? '');
  return text.replace(/^🎯\s*@[^:]+:\s*/i, '').trim();
}

export function getAskedQuestionTexts(messages: LiveMessage[]): string[] {
  return messages
    .filter((m) => m.message_type === 'question' && m.sender_id === 'ai')
    .map((m) => extractQuestionBare(m.content));
}

function getMessagesAfterQuestion(
  messages: LiveMessage[],
  question: LiveMessage | null
): LiveMessage[] {
  if (!question) return messages.filter((m) => m.message_type === 'message');
  const idx = messages.findIndex((m) => m.id === question.id);
  if (idx < 0) return [];
  return messages.slice(idx + 1);
}

function getReadyUserIds(
  messages: LiveMessage[],
  questionId: string | null
): Set<string> {
  const ready = new Set<string>();
  if (!questionId) return ready;

  for (const m of messages) {
    if (m.message_type !== 'system') continue;
    const meta = m.metadata;
    if (meta?.action !== READY_NEXT_ACTION) continue;
    if (meta.questionId !== questionId) continue;
    const uid = meta.userId;
    if (typeof uid === 'string') ready.add(uid);
  }
  return ready;
}

/** Czy po danym pytaniu pojawiło się już kolejne (ktoś wygenerował następne). */
export function questionAdvancedAfter(messages: LiveMessage[], questionId: string): boolean {
  const qIndex = messages.findIndex((m) => m.id === questionId);
  if (qIndex < 0) return false;
  return messages.slice(qIndex + 1).some((m) => m.message_type === 'question');
}

/** Czy inne urządzenie już rozpoczęło generowanie po tym pytaniu. */
export function generationLockAfter(messages: LiveMessage[], questionId: string): boolean {
  const qIndex = messages.findIndex((m) => m.id === questionId);
  const after = qIndex >= 0 ? messages.slice(qIndex + 1) : messages;
  return after.some(
    (m) =>
      m.message_type === 'system' &&
      m.metadata?.action === GENERATION_LOCK_ACTION &&
      m.metadata?.questionId === questionId
  );
}

/** Deterministyczny „lider” generowania — tylko jedno urządzenie woła AI. */
export function shouldLeadGeneration(
  currentUserId: string,
  partnerUserIds: string[]
): boolean {
  const participants = [currentUserId, ...partnerUserIds].filter(Boolean).sort();
  if (participants.length === 0) return true;
  return participants[0] === currentUserId;
}

/** Tylko host/creator pokoju generuje pytania mediatora. */
export function shouldHostLeadGeneration(
  currentUserId: string,
  hostUserId: string
): boolean {
  if (!hostUserId) return true;
  return currentUserId === hostUserId;
}

export function resolveStableParticipantNames(
  isHost: boolean,
  currentUserName?: string,
  coupledPartnerName?: string
): ParticipantNames {
  if (isHost) {
    return { hostName: currentUserName, partnerName: coupledPartnerName };
  }
  return { hostName: coupledPartnerName, partnerName: currentUserName };
}

export function hasOpeningSummaryMessage(messages: LiveMessage[]): boolean {
  return messages.some(
    (m) =>
      m.sender_id === 'ai' &&
      (m.message_type === 'summary' ||
        m.metadata?.summaryKind === 'opening_summary' ||
        m.metadata?.summaryKind === 'opening')
  );
}

export function hasOpeningFactsQuestion(messages: LiveMessage[]): boolean {
  return messages.some(
    (m) =>
      m.sender_id === 'ai' &&
      m.message_type === 'question' &&
      (m.metadata?.questionId === 'gap_facts' ||
        extractQuestionBare(m.content).toLowerCase().includes('konkretne wydarzenie') ||
        extractQuestionBare(m.content).toLowerCase().includes('concrete event'))
  );
}

export { hasMediatorOpeningDelivered } from '@/services/mediatorRuntimeClient/openingBootstrapGuards';

export function shouldSkipOpeningBootstrap(messages: LiveMessage[]): boolean {
  return shouldSkipOpeningBootstrapGuard(
    messages.map((message) => ({
      sender_id: message.sender_id,
      message_type: message.message_type,
      content: message.content,
      metadata: message.metadata,
    }))
  );
}
export function hintsSentAfterQuestion(messages: LiveMessage[], questionId: string): boolean {
  const qIndex = messages.findIndex((m) => m.id === questionId);
  if (qIndex < 0) return false;
  return messages.slice(qIndex + 1).some((m) => m.message_type === 'hint');
}

export function canGenerateNextQuestion(
  turn: LiveTurnState,
  partnerUserIds: string[]
): boolean {
  if (!turn.lastQuestion || !turn.bothAnswered) return false;
  if (partnerUserIds.length === 0) return false;
  return true;
}

export function hasSummaryKind(messages: LiveMessage[], kind: string): boolean {
  return messages.some(
    (m) =>
      (m.message_type === 'summary' || m.message_type === 'system') &&
      m.metadata?.summaryKind === kind
  );
}

export function computeLiveTurnState(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): LiveTurnState {
  const lastQuestion = getLastQuestionMessage(messages);
  const questionNumber = countAskedQuestions(messages);
  const derived = deriveParticipantReplyStateFromMessages({
    messages,
    currentQuestionTurn: questionNumber > 0 ? questionNumber : null,
    hostUserId,
    partnerUserIds,
  });

  const hostAnswered = derived.hostReplied;
  const partnerAnswered = derived.partnerReplied;
  const bothAnswered = derived.bothReplied;

  const readyIds = getReadyUserIds(messages, lastQuestion?.id ?? null);

  const hostReady = readyIds.has(hostUserId);
  const partnerReady =
    partnerUserIds.length === 0
      ? false
      : partnerUserIds.some((id) => readyIds.has(id));

  return {
    lastQuestion,
    questionNumber,
    hostAnswered,
    partnerAnswered,
    hostReady,
    partnerReady,
    bothAnswered,
    bothReady: hostReady && partnerReady,
    midSummaryShown: hasSummaryKind(messages, 'mid_summary'),
    endCheckShown: hasSummaryKind(messages, 'end_check'),
    finalSummaryShown: hasSummaryKind(messages, 'final_summary'),
    extensionCheckShown: hasSummaryKind(messages, 'extension_check'),
    proposedSolutionShown: hasSummaryKind(messages, 'proposed_solution'),
  };
}

export function isExtensionActive(messages: LiveMessage[]): boolean {
  return messages.some(
    (m) => m.message_type === 'system' && m.metadata?.action === EXTENSION_START_ACTION
  );
}

function getLastSummaryByKind(
  messages: LiveMessage[],
  kind: string
): LiveMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.message_type === 'summary' && m.metadata?.summaryKind === kind) return m;
    if (
      m.sender_id === 'ai' &&
      m.message_type === 'system' &&
      m.metadata?.summaryKind === kind
    ) {
      return m;
    }
  }
  return null;
}

function hasSessionDecisionAfter(
  messages: LiveMessage[],
  summaryKind: string,
  decision: 'continue' | 'resolved',
  afterMessageId?: string
): boolean {
  const startIdx = afterMessageId
    ? messages.findIndex((m) => m.id === afterMessageId) + 1
    : 0;
  if (startIdx < 0) return false;
  return messages.slice(startIdx).some(
    (m) =>
      m.message_type === 'system' &&
      m.metadata?.action === SESSION_DECISION_ACTION &&
      m.metadata?.decision === decision &&
      m.metadata?.summaryKind === summaryKind
  );
}

function bothPartnersDecided(
  messages: LiveMessage[],
  summaryKind: string,
  decision: 'continue',
  hostUserId: string,
  partnerUserIds: string[],
  afterMessageId?: string
): boolean {
  const startIdx = afterMessageId
    ? messages.findIndex((m) => m.id === afterMessageId) + 1
    : 0;
  const ready = new Set<string>();
  for (const m of messages.slice(Math.max(0, startIdx))) {
    if (m.message_type !== 'system') continue;
    const meta = m.metadata;
    if (meta?.action !== SESSION_DECISION_ACTION) continue;
    if (meta.summaryKind !== summaryKind) continue;
    if (meta.decision !== decision) continue;
    const uid = meta.userId;
    if (typeof uid === 'string') ready.add(uid);
  }
  if (!ready.has(hostUserId)) return false;
  if (partnerUserIds.length === 0) return true;
  return partnerUserIds.some((id) => ready.has(id));
}

function progressFromQuestionCount(n: number, max = LIVE_QUESTIONS_TARGET): number {
  return Math.min(100, Math.max(5, Math.round((n / max) * 100)));
}

const TARGET_PREFIX_LEGACY: Record<QuestionTarget, string> = {
  ty: '@Ty',
  partner: '@Partner',
  oboje: '@Oboje',
};

const TARGET_BADGE_LEGACY: Record<QuestionTarget, string> = {
  ty: 'Ty',
  partner: 'Partner',
  oboje: 'Oboje',
};

export function formatQuestionWithTarget(
  question: string,
  target: QuestionTarget,
  lang: Language = 'pl'
): string {
  const bare = question
    .replace(/^🎯\s*@[^:]+:\s*/i, '')
    .replace(/^🎯\s*/, '')
    .trim();
  if (target === 'oboje') return bare;
  const prefixes = liveStrings(lang).targetPrefix;
  const map = { ty: prefixes.ty, partner: prefixes.partner, oboje: prefixes.oboje };
  return `🎯 ${map[target]}: ${bare}`;
}

export function getQuestionTargetFromMessage(message: LiveMessage): QuestionTarget | null {
  const meta = message.metadata?.questionTarget;
  if (meta === 'ty' || meta === 'partner' || meta === 'oboje') return meta;
  const match = message.content.match(/^🎯\s*@(Ty|Partner|Oboje):/i);
  if (!match) return null;
  const key = match[1].toLowerCase();
  if (key === 'ty') return 'ty';
  if (key === 'partner') return 'partner';
  return 'oboje';
}

export function getQuestionTargetBadgeLabel(target: QuestionTarget, lang: Language = 'pl'): string {
  return liveStrings(lang).targetBadge[target] ?? TARGET_BADGE_LEGACY[target];
}

export interface MediationContext {
  combinedDescription: string;
  partnerCombinedDescription?: string;
  analysis: Record<string, unknown> | null;
  partnerAnalysis?: Record<string, unknown> | null;
  priorAgreements?: string;
}

export async function fetchMediationContext(mediationId: string): Promise<MediationContext> {
  await prepareSupabaseRequest();
  const { data, error } = await supabase
    .from('mediations')
    .select(
      'combined_description, partner_combined_description, analysis, partner_analysis'
    )
    .eq('id', mediationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Nie udało się wczytać kontekstu mediacji.');
  }

  return {
    combinedDescription: data?.combined_description || '',
    partnerCombinedDescription: data?.partner_combined_description || '',
    analysis: (data?.analysis as Record<string, unknown>) || null,
    partnerAnalysis: (data?.partner_analysis as Record<string, unknown>) || null,
  };
}

function buildAnalysisSummary(
  analysis: Record<string, unknown> | null,
  partnerAnalysis?: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  const summary: Record<string, unknown> = {};

  const mergeFrom = (source: Record<string, unknown> | null | undefined, prefix = '') => {
    if (!source) return;
    for (const key of [
      'analysis_version',
      'situation_summary',
      'emotions_explanation',
      'needs_explanation',
      'what_could_improve',
      'user_emotions',
      'user_needs',
      'core_conflict',
      'misunderstanding',
      'what_went_wrong',
      'situation_facts',
      'key_trigger',
      'doing_well',
      'doing_well_detail',
      'perspective_gap',
      'perspective_gap_title',
      'perspective_gap_detail',
      'suggestion_quote',
      'emotionsSummary',
      'needsSummary',
    ]) {
      const value = source[key];
      if (value == null || value === '') continue;
      const outKey = prefix ? `${prefix}_${key}` : key;
      if (summary[outKey] == null) summary[outKey] = value;
    }
  };

  mergeFrom(analysis);
  mergeFrom(partnerAnalysis, 'partner');

  return Object.keys(summary).length > 0 ? summary : undefined;
}

export interface LiveBriefing {
  situationSummary: string;
  emotionTags: string[];
  needTags: string[];
  keyTrigger: string;
}

function stringFromAnalysisField(
  analysis: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!analysis) return '';
  for (const key of keys) {
    const value = analysis[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function tagsFromAnalysisField(
  analysis: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string[] {
  if (!analysis) return [];
  for (const key of keys) {
    const value = analysis[key];
    if (Array.isArray(value)) {
      return value
        .filter((v) => typeof v === 'string' && v.length <= 32)
        .slice(0, 4) as string[];
    }
  }
  return [];
}

function primaryAnalysisContext(analysis: Record<string, unknown> | null | undefined): string {
  return (
    stringFromAnalysisField(
      analysis,
      'situation_summary',
      'key_trigger',
      'situation_facts',
      'core_conflict',
      'what_went_wrong',
      'perspective_gap_detail'
    ) || ''
  );
}

export function buildBriefingFromContext(ctx: MediationContext | null): LiveBriefing | null {
  if (!ctx?.analysis) return null;
  const situationSummary = primaryAnalysisContext(ctx.analysis);
  const keyTrigger = stringFromAnalysisField(ctx.analysis, 'key_trigger');
  const emotionTags = tagsFromAnalysisField(ctx.analysis, 'user_emotions');
  const needTags = tagsFromAnalysisField(ctx.analysis, 'user_needs');
  if (!situationSummary && !keyTrigger && emotionTags.length === 0 && needTags.length === 0) {
    return null;
  }
  return { situationSummary, emotionTags, needTags, keyTrigger };
}

export function buildOpeningLiveMessages(
  mediationId: string,
  _ctx: MediationContext | null,
  lang: Language = 'pl'
): LiveMessage[] {
  const s = liveStrings(lang);
  const ts = Date.now();
  const now = new Date().toISOString();

  return [
    {
      id: `opening-system-${ts}`,
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: s.aiName,
      content: s.openingEmotionsStart,
      message_type: 'system',
      is_private: false,
      recipient_id: null,
      phase: 0,
      metadata: { opening: true, loading: true },
      created_at: now,
    },
  ];
}

function truncateCombinedDescription(description: string, maxLen = 500): string {
  const trimmed = description.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function resolveSenderRole(
  senderId: string,
  hostUserId: string,
  partnerUserIds: string[]
): 'user' | 'partner' | 'ai' {
  if (senderId === 'ai') return 'ai';
  if (senderId === hostUserId) return 'user';
  if (partnerUserIds.includes(senderId) || senderId === SIMULATED_PARTNER_ID) {
    return 'partner';
  }
  return 'user';
}

function normalizeEdgeResponse(
  result: LiveMediatorResponse,
  triggerMessage: LiveMessage,
  currentPhase: number,
  currentQuestionIndex: number
): LiveMediatorResponse {
  const phase = Math.min(4, Math.max(1, result.phase ?? currentPhase));
  return {
    ...result,
    triggerMessageId: result.triggerMessageId ?? triggerMessage.id,
    phase,
    progress: result.progress ?? getPhaseProgress(phase),
    nextQuestionIndex: result.nextQuestionIndex ?? currentQuestionIndex,
  };
}

export function getDefaultQuestion(_phase = 1, lang: Language = 'pl'): string {
  return questionFlow(lang)[0];
}

export function getPhaseLabel(
  phase: number,
  lang: Language = 'pl',
  flow?: LiveSessionFlow | null
): string {
  const ui = getLiveMediationExtras(lang).live;
  const max = flow?.maxQuestions ?? LIVE_QUESTIONS_TARGET;
  const n = Math.min(Math.max(phase, 1), max);
  const base = fmt(ui.questionLabel, { n: String(n), total: String(max) });
  if (!flow) return base;
  const phaseLabels = ui.phaseLabels;
  const phaseName = phaseLabels?.[flow.questionPhase];
  return phaseName ? `${base} · ${phaseName}` : base;
}

export function getPhaseProgress(
  phase: number,
  progress?: number,
  maxQuestions = LIVE_QUESTIONS_TARGET
): number {
  if (progress != null) return Math.min(100, Math.max(0, progress));
  return progressFromQuestionCount(phase, maxQuestions);
}

export function createMockLiveSession(mediationId: string, userId: string): LiveSession {
  return {
    id: mediationId,
    user_id: userId,
    partner_id: null,
    live_phase: 1,
    live_paused: false,
    live_progress: 10,
    current_question: getDefaultQuestion(1),
    current_question_index: 0,
    partner_typing: false,
    status: 'live',
  };
}

function mapMessage(row: any): LiveMessage {
  return {
    id: row.id,
    mediation_id: row.mediation_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    content: row.content,
    message_type: row.message_type,
    is_private: row.is_private,
    recipient_id: row.recipient_id,
    phase: row.phase,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

async function liveMessagesHeaders() {
  await prepareSupabaseRequest();
  return getSupabaseRequestHeaders();
}

export async function fetchLiveSession(
  mediationId: string,
  userId: string
): Promise<LiveSession> {
  const { data, error } = await supabase
    .from('mediations')
    .select(
      'id, user_id, partner_id, live_phase, live_paused, live_progress, current_question, current_question_index, partner_typing, status'
    )
    .eq('id', mediationId)
    .maybeSingle();

  if (error || !data) {
    return createMockLiveSession(mediationId, userId);
  }

  return data as LiveSession;
}

export async function initLiveSession(
  mediationId: string,
  userId: string,
  lang: Language = 'pl'
): Promise<void> {
  try {
    await liveMessagesHeaders();

    const { data: existing } = await supabase
      .from('mediations')
      .select('user_id, status, current_question_index')
      .eq('id', mediationId)
      .maybeSingle();

    const isHost = existing?.user_id === userId;
    if (!isHost) {
      // Partner nie inicjuje sesji — czeka aż host wystartuje i zapisze wiadomości.
      return;
    }

    const alreadyLive = existing?.status === 'live';

    if (!alreadyLive) {
      await supabase
        .from('mediations')
        .update({
          live_phase: 1,
          live_progress: 10,
          live_paused: false,
          current_question: getDefaultQuestion(1, lang),
          current_question_index: 0,
          status: 'live',
          updated_at: new Date().toISOString(),
        })
        .eq('id', mediationId)
        .eq('user_id', userId);
    }

    await liveMessagesHeaders();
    const { count } = await supabase
      .from('live_messages')
      .select('id', { count: 'exact', head: true })
      .eq('mediation_id', mediationId);

    if ((count || 0) === 0) {
      let context: MediationContext = { combinedDescription: '', analysis: null };
      try {
        context = await fetchMediationContext(mediationId);
      } catch {
        // Generic opening if context unavailable.
      }
      const opening = buildOpeningLiveMessages(mediationId, context, lang);
      for (const msg of opening) {
        await supabase.from('live_messages').insert({
          mediation_id: mediationId,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          content: msg.content,
          message_type: msg.message_type,
          is_private: msg.is_private,
          recipient_id: msg.recipient_id,
          phase: msg.phase,
          metadata: msg.metadata,
        });
      }
    }
  } catch {
    // Local/demo fallback allowed.
  }
}

function classifyMessageRole(
  message: LiveMessage,
  hostUserId?: string
): 'user' | 'ai' | 'partner' | 'hint' | 'other' {
  if (message.message_type === 'hint') {
    return 'hint';
  }
  if (message.sender_id === 'ai' || message.message_type === 'question' || message.message_type === 'system') {
    return 'ai';
  }
  if (hostUserId && message.sender_id === hostUserId && message.message_type === 'message') {
    return 'user';
  }
  if (message.message_type === 'message') {
    return 'partner';
  }
  return 'other';
}

function logMessageTypeBreakdown(
  label: string,
  messages: LiveMessage[],
  hostUserId?: string
): void {
  const counts = countMessagesByRole(messages, hostUserId);
  const types = [...new Set(messages.map((m) => m.message_type))];
  console.log(`[${label}] types returned:`, types);
  console.log(
    `[${label}] after merge: ${counts.user} user, ${counts.ai} ai, ${counts.partner} partner, ${counts.hint} hint, ${counts.other} other`
  );
}

export function countMessagesByRole(
  messages: LiveMessage[],
  hostUserId?: string
): {
  user: number;
  ai: number;
  partner: number;
  hint: number;
  other: number;
  total: number;
} {
  const counts = { user: 0, ai: 0, partner: 0, hint: 0, other: 0 };
  for (const m of messages) {
    counts[classifyMessageRole(m, hostUserId)]++;
  }
  return { ...counts, total: messages.length };
}

function logMessageSummary(label: string, messages: LiveMessage[], hostUserId?: string) {
  logMessageTypeBreakdown(label, messages, hostUserId);
  console.log(
    `[${label}] count=${messages.length}`,
    messages.map((m) => ({
      id: m.id.slice(0, 8),
      sender_id: m.sender_id,
      message_type: m.message_type,
      is_private: m.is_private,
      recipient_id: m.recipient_id,
    }))
  );
}

export async function fetchLiveMessages(
  mediationId: string,
  options: FetchLiveMessagesOptions = {},
  hostUserId?: string
): Promise<FetchMessagesResult> {
  const { force = false } = options;

  if (!force) {
    const cached = liveMessagesCache.get(mediationId);
    if (cached) {
      console.log('[fetchLiveMessages] cache hit mediationId=', mediationId);
      return { messages: cached, error: null };
    }
  } else {
    console.log('[fetchLiveMessages] force refresh mediationId=', mediationId);
    liveMessagesCache.delete(mediationId);
  }

  try {
    await liveMessagesHeaders();
    console.log(
      `[fetchLiveMessages] SELECT * FROM live_messages WHERE mediation_id='${mediationId}' ORDER BY created_at ASC /* no sender_id filter, no message_type filter */`
    );
    const { data, error } = await supabase
      .from('live_messages')
      .select('*')
      .eq('mediation_id', mediationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchLiveMessages] error:', error.message);
      return { messages: [], error: error.message || 'Nie udało się załadować historii.' };
    }

    const messages = (data || []).map(mapMessage);
    liveMessagesCache.set(mediationId, messages);
    logMessageSummary('fetchLiveMessages', messages, hostUserId);
    return { messages, error: null };
  } catch (e) {
    console.error('[fetchLiveMessages] exception:', e);
    return { messages: [], error: 'Nie udało się załadować historii. Spróbuj ponownie.' };
  }
}

export function mergeLiveMessages(
  local: LiveMessage[],
  remote: LiveMessage[],
  hostUserId?: string
): LiveMessage[] {
  logMessageSummary('mergeLiveMessages:before:local', local, hostUserId);
  logMessageSummary('mergeLiveMessages:before:remote', remote, hostUserId);

  // Remote is source of truth — include ALL types (user, ai, partner, hint).
  const remoteIds = new Set(remote.map((m) => m.id));
  const remoteKeys = new Set(remote.map((m) => messageDedupeKey(m)));
  const pendingLocal = local.filter(
    (m) =>
      isEphemeralMessageId(m.id) &&
      !remoteIds.has(m.id) &&
      !remoteKeys.has(messageDedupeKey(m))
  );

  const merged = dedupeLiveMessages([...remote, ...pendingLocal]);

  const counts = countMessagesByRole(merged, hostUserId);
  console.log(
    `[merge] total: ${counts.total}, user: ${counts.user}, ai: ${counts.ai}, partner: ${counts.partner}, hint: ${counts.hint}`
  );
  console.log(
    `[mergeLiveMessages] before: local=${local.length} remote=${remote.length} → after: ${counts.total}`
  );

  return merged;
}

/** Messages visible in chat feed (public + own private hints for inline attachment). */
export function filterVisibleLiveMessages(
  messages: LiveMessage[],
  currentUserId: string
): LiveMessage[] {
  return messages.filter((m) => {
    if (!m.is_private) return true;
    if (m.message_type === 'summary') return true;
    if (m.message_type === 'hint' && m.recipient_id === currentUserId) return true;
    if (m.message_type === 'fun_fact' && m.recipient_id === currentUserId) return true;
    return false;
  });
}

function isStaleLiveEdgeResponse(result: LiveMediatorResponse): boolean {
  const pub = result.publicMessage || '';
  return (
    result.source === 'fallback' &&
    /W kontekście wcześniejszej analizy|Słyszę:\s*«/i.test(pub)
  );
}

function polishMediatorLeak(language: Language, result: LiveMediatorResponse): boolean {
  if (language === 'pl') return false;
  const blob = `${result.publicMessage || ''} ${result.aiQuestion || ''} ${result.escalationMessage || ''}`;
  return (
    result.source === 'fallback' ||
    looksLikePolishCoachText(blob) ||
    /poczułeś|poczulaś|W tle sporu|brzmi jak unikanie/i.test(blob)
  );
}

export function subscribeLiveMessages(
  mediationId: string,
  onInsert: (message: LiveMessage) => void,
  onSessionUpdate?: (session: Partial<LiveSession>) => void
): () => void {
  const messagesChannel = supabase
    .channel(`live-messages:${mediationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_messages',
        filter: `mediation_id=eq.${mediationId}`,
      },
      (payload) => {
        const msg = mapMessage(payload.new);
        invalidateLiveMessagesCache(mediationId);
        console.log('[subscribeLiveMessages] received', {
          id: msg.id,
          sender_id: msg.sender_id,
          message_type: msg.message_type,
          is_private: msg.is_private,
        });
        onInsert(msg);
      }
    )
    .subscribe();

  const sessionChannel = supabase
    .channel(`live-session:${mediationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'mediations',
        filter: `id=eq.${mediationId}`,
      },
      (payload) => {
        onSessionUpdate?.(payload.new as Partial<LiveSession>);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(messagesChannel);
    supabase.removeChannel(sessionChannel);
  };
}

export async function sendUserMessage(
  mediationId: string,
  userId: string,
  userName: string,
  content: string,
  phase: number,
  replyToQuestionId?: string | null
): Promise<LiveMessage> {
  const trimmed = content.trim();
  await liveMessagesHeaders();
  const metadata =
    replyToQuestionId && replyToQuestionId.trim()
      ? { replyToQuestionId: replyToQuestionId.trim() }
      : undefined;
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: trimmed,
      message_type: 'message',
      is_private: false,
      phase,
      metadata,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Nie udało się zapisać wiadomości. Spróbuj ponownie.');
  }

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  console.log('[sendUserMessage] saved', {
    id: saved.id,
    sender_id: saved.sender_id,
    is_private: saved.is_private,
    content: saved.content.slice(0, 40),
  });
  return saved;
}

function hintToContent(hint: PrivateHint): string {
  return [
    hint.tone ? `💬 ${hint.tone}` : '',
    hint.emotion ? `🫁 ${hint.emotion}` : '',
    hint.suggestion ? `💡 ${hint.suggestion}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function createLocalReadyMessage(
  mediationId: string,
  userId: string,
  userName: string,
  questionId: string,
  phase: number
): LiveMessage {
  return {
    id: `local-ready-${userId}-${questionId}`,
    mediation_id: mediationId,
    sender_id: userId,
    sender_name: userName,
    content: '',
    message_type: 'system',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: { action: READY_NEXT_ACTION, userId, questionId },
    created_at: new Date().toISOString(),
  };
}

export async function insertAiMessages(
  mediationId: string,
  phase: number,
  response: LiveMediatorResponse,
  hostUserId: string,
  partnerUserId?: string | null,
  sentAiMessagesRef?: Set<string>
): Promise<void> {
  const sentContent = getSentAiContentSet(mediationId, sentAiMessagesRef);
  const inserts: object[] = [];

  if (response.phaseTransition) {
    const content = coerceMediatorText(response.phaseTransition);
    if (isValidOutgoingChatContent(content)) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'system',
        is_private: false,
        phase: response.phase ?? phase,
        metadata: { phaseTransition: true },
      });
    }
  }

  if (
    response.summaryType === 'opening' ||
    response.summaryType === 'mid' ||
    response.summaryType === 'final' ||
    response.summaryType === 'extension_check' ||
    response.summaryType === 'proposed_solution' ||
    response.summaryType === 'closure'
  ) {
    const kindMap: Record<string, string> = {
      opening: 'opening_summary',
      mid: 'mid_summary',
      final: 'final_summary',
      extension_check: 'extension_check',
      proposed_solution: 'proposed_solution',
      closure: 'closure_summary',
    };
    const kind = kindMap[response.summaryType] || response.summaryType;
    const content = coerceMediatorText(response.publicMessage);
    if (isValidOutgoingChatContent(content)) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'summary',
        is_private: false,
        phase: response.phase ?? phase,
        metadata: { summaryKind: kind },
      });
    }
  } else if (response.publicMessage) {
    const content = coerceMediatorText(response.publicMessage);
    if (isValidOutgoingChatContent(content)) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'system',
        is_private: false,
        phase: response.phase ?? phase,
      });
    }
  }

  if (response.aiQuestion) {
    const content = coerceMediatorText(response.aiQuestion);
    if (isValidOutgoingChatContent(content)) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'question',
        is_private: false,
        phase: response.phase ?? phase,
        metadata: {
          questionTarget: 'oboje',
          questionIndex: response.nextQuestionIndex ?? response.phase ?? phase,
        },
      });
    }
  }

  if (response.privateHint) {
    const content = hintToContent(response.privateHint);
    if (content.length >= 20) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'hint',
        is_private: true,
        recipient_id: hostUserId,
        phase: response.phase ?? phase,
        metadata: {
          ...(response.privateHint as Record<string, unknown>),
          triggerMessageId: response.triggerMessageId,
        },
      });
    }
  }

  if (response.funFact?.trim()) {
    inserts.push({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: response.funFact.trim(),
      message_type: 'fun_fact',
      is_private: true,
      recipient_id: hostUserId,
      phase: response.phase ?? phase,
      metadata: {
        kind: 'funFact',
        triggerMessageId: response.triggerMessageId,
      },
    });
  }

  if (response.partnerPrivateHint && isValidPartnerUserId(partnerUserId)) {
    const content = hintToContent(response.partnerPrivateHint);
    if (content) {
      inserts.push({
        mediation_id: mediationId,
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'hint',
        is_private: true,
        recipient_id: partnerUserId!,
        phase: response.phase ?? phase,
        metadata: {
          ...(response.partnerPrivateHint as Record<string, unknown>),
          triggerMessageId: response.triggerMessageId,
        },
      });
    }
  }

  if (response.escalationDetected && response.escalationMessage) {
    inserts.push({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: response.escalationMessage,
      message_type: 'system',
      is_private: false,
      phase: response.phase ?? phase,
      metadata: { escalation: true },
    });
  }

  try {
    if (inserts.length > 0) {
      const recentAi = await fetchRecentAiMessages(mediationId, 30);
      const batchKeys = new Set<string>();
      let skippedDuplicates = 0;
      let skippedByRef = 0;
      const nowIso = new Date().toISOString();

      const toInsert = inserts.filter((row) => {
        const typedRow = row as {
          content: string;
          sender_id: string;
          metadata?: Record<string, unknown>;
        };
        const content = coerceMediatorText(typedRow.content);
        if (!isValidOutgoingChatContent(content)) {
          return false;
        }

        if (sentContent.has(content)) {
          skippedByRef++;
          console.log(
            `[insertAiMessages] duplicate prevented by ref: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`
          );
          return false;
        }

        if (isRecentAiDuplicate({ content }, recentAi)) {
          skippedDuplicates++;
          return false;
        }
        const key = messageDedupeKey({
          mediation_id: mediationId,
          sender_id: typedRow.sender_id,
          content,
          created_at: nowIso,
        });
        if (batchKeys.has(key)) {
          skippedDuplicates++;
          return false;
        }
        batchKeys.add(key);
        return true;
      });

      console.log(`[insertAiMessages] inserting ${toInsert.length} messages`);
      console.log(
        `[insertAiMessages] skipped ${skippedDuplicates} duplicates, ${skippedByRef} by ref`
      );

      if (toInsert.length > 0) {
        await liveMessagesHeaders();
        const { error: insertError } = await supabase.from('live_messages').insert(toInsert);
        if (insertError) {
          throw new Error(insertError.message || 'Nie udało się zapisać odpowiedzi AI.');
        }
        for (const row of toInsert) {
          const content = coerceMediatorText((row as { content: string }).content);
          if (content) sentContent.add(content);
        }
        invalidateLiveMessagesCache(mediationId);
      }
    }

    const { error: sessionError } = await supabase
      .from('mediations')
      .update({
        live_phase: response.phase ?? phase,
        live_progress: response.progress ?? getPhaseProgress(response.phase ?? phase),
        current_question: response.aiQuestion ?? undefined,
        current_question_index: response.nextQuestionIndex ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediationId);

    if (sessionError) {
      throw new Error(sessionError.message || 'Nie udało się zaktualizować fazy mediacji.');
    }

    console.log('[insertAiMessages] updated live_phase=', response.phase ?? phase);
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e ?? 'Nie udało się zapisać odpowiedzi AI.'));
  }
}

export function buildLocalAiMessages(
  mediationId: string,
  phase: number,
  response: LiveMediatorResponse,
  hostUserId: string,
  partnerUserId?: string | null
): LiveMessage[] {
  const messages: LiveMessage[] = [];
  let tick = 0;
  const nextId = (prefix: string) =>
    `local-ai-${prefix}-${Date.now()}-${tick++}-${Math.random().toString(36).slice(2, 7)}`;
  const nextCreatedAt = (offsetMs = 0) =>
    new Date(Date.now() + offsetMs).toISOString();

  const pushMessage = (partial: Omit<LiveMessage, 'mediation_id'>) => {
    messages.push({
      ...partial,
      mediation_id: mediationId,
    });
  };

  const phaseValue = response.phase ?? phase;

  if (response.phaseTransition) {
    const content = coerceMediatorText(response.phaseTransition);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('transition'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'system',
        is_private: false,
        recipient_id: null,
        phase: phaseValue,
        metadata: { phaseTransition: true },
        created_at: nextCreatedAt(),
      });
    }
  }

  if (
    response.summaryType === 'opening' ||
    response.summaryType === 'mid' ||
    response.summaryType === 'final' ||
    response.summaryType === 'extension_check' ||
    response.summaryType === 'proposed_solution' ||
    response.summaryType === 'closure'
  ) {
    const kindMap: Record<string, string> = {
      opening: 'opening_summary',
      mid: 'mid_summary',
      final: 'final_summary',
      extension_check: 'extension_check',
      proposed_solution: 'proposed_solution',
      closure: 'closure_summary',
    };
    const kind = kindMap[response.summaryType] || response.summaryType;
    const content = coerceMediatorText(response.publicMessage);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('summary'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'summary',
        is_private: false,
        recipient_id: null,
        phase: phaseValue,
        metadata: { summaryKind: kind, source: response.source },
        created_at: nextCreatedAt(),
      });
    }
  } else if (response.publicMessage) {
    const content = coerceMediatorText(response.publicMessage);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('public'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'system',
        is_private: false,
        recipient_id: null,
        phase: phaseValue,
        metadata: null,
        created_at: nextCreatedAt(),
      });
    }
  }

  if (response.aiQuestion) {
    const content = coerceMediatorText(response.aiQuestion);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('question'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'question',
        is_private: false,
        recipient_id: null,
        phase: phaseValue,
        metadata: {
          questionTarget: 'oboje',
          questionIndex: response.nextQuestionIndex ?? response.phase ?? phase,
          source: response.source,
        },
        created_at: nextCreatedAt(1),
      });
    }
  }

  if (response.privateHint) {
    const content = hintToContent(response.privateHint);
    if (content.length >= 20) {
      pushMessage({
        id: nextId('hint'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'hint',
        is_private: true,
        recipient_id: hostUserId,
        phase: phaseValue,
        metadata: {
          ...(response.privateHint as Record<string, unknown>),
          triggerMessageId: response.triggerMessageId,
        },
        created_at: nextCreatedAt(2),
      });
    }
  }

  if (response.funFact?.trim()) {
    const content = coerceMediatorText(response.funFact);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('funfact'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'fun_fact',
        is_private: true,
        recipient_id: hostUserId,
        phase: phaseValue,
        metadata: { kind: 'funFact', triggerMessageId: response.triggerMessageId },
        created_at: nextCreatedAt(3),
      });
    }
  }

  if (response.partnerPrivateHint && isValidPartnerUserId(partnerUserId)) {
    const content = hintToContent(response.partnerPrivateHint);
    if (content) {
      pushMessage({
        id: nextId('partner-hint'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'hint',
        is_private: true,
        recipient_id: partnerUserId!,
        phase: phaseValue,
        metadata: {
          ...(response.partnerPrivateHint as Record<string, unknown>),
          triggerMessageId: response.triggerMessageId,
        },
        created_at: nextCreatedAt(4),
      });
    }
  }

  if (response.escalationDetected && response.escalationMessage) {
    const content = coerceMediatorText(response.escalationMessage);
    if (isValidOutgoingChatContent(content)) {
      pushMessage({
        id: nextId('escalation'),
        sender_id: 'ai',
        sender_name: 'Mediator AI',
        content,
        message_type: 'system',
        is_private: false,
        recipient_id: null,
        phase: phaseValue,
        metadata: { escalation: true },
        created_at: nextCreatedAt(5),
      });
    }
  }

  return filterValidLiveAiMessages(messages);
}

export function formatHintPreview(hint?: PrivateHint, lang: Language = 'pl'): string {
  const s = liveStrings(lang);
  if (!hint) return s.hintDefault;
  const line = hint.tone || hint.suggestion || hint.emotion;
  return line ? fmt(s.hintPrefix, { line }) : s.hintAnalyzing;
}

export async function signalReadyForNextQuestion(
  mediationId: string,
  userId: string,
  userName: string,
  questionId: string,
  phase: number
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: '',
      message_type: 'system',
      is_private: false,
      phase,
      metadata: {
        action: READY_NEXT_ACTION,
        userId,
        questionId,
      },
    })
    .select('*')
    .single();

  if (error || !data) {
    return createLocalReadyMessage(mediationId, userId, userName, questionId, phase);
  }

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  return saved;
}

export function createLocalSessionDecisionMessage(
  mediationId: string,
  userId: string,
  userName: string,
  decision: 'continue' | 'resolved',
  summaryKind: 'final_summary' | 'extension_check',
  phase: number
): LiveMessage {
  return {
    id: `local-decision-${userId}-${summaryKind}-${decision}`,
    mediation_id: mediationId,
    sender_id: userId,
    sender_name: userName,
    content: '',
    message_type: 'system',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: {
      action: SESSION_DECISION_ACTION,
      userId,
      decision,
      summaryKind,
    },
    created_at: new Date().toISOString(),
  };
}

export async function signalSessionDecision(
  mediationId: string,
  userId: string,
  userName: string,
  decision: 'continue' | 'resolved',
  summaryKind: 'final_summary' | 'extension_check',
  phase: number
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: '',
      message_type: 'system',
      is_private: false,
      phase,
      metadata: {
        action: SESSION_DECISION_ACTION,
        userId,
        decision,
        summaryKind,
      },
    })
    .select('*')
    .single();

  if (error || !data) {
    return createLocalSessionDecisionMessage(
      mediationId,
      userId,
      userName,
      decision,
      summaryKind,
      phase
    );
  }

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  return saved;
}

export async function signalExtensionStart(
  mediationId: string,
  phase: number
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: '',
      message_type: 'system',
      is_private: false,
      phase,
      metadata: { action: EXTENSION_START_ACTION },
    })
    .select('*')
    .single();

  const fallback: LiveMessage = {
    id: `local-ext-start-${Date.now()}`,
    mediation_id: mediationId,
    sender_id: 'ai',
    sender_name: 'Mediator AI',
    content: '',
    message_type: 'system',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: { action: EXTENSION_START_ACTION },
    created_at: new Date().toISOString(),
  };

  if (error || !data) return fallback;
  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  return saved;
}

export function getSessionDecisionState(
  messages: LiveMessage[],
  summaryKind: 'final_summary' | 'extension_check',
  hostUserId: string,
  partnerUserIds: string[]
): { hostDecided: boolean; partnerDecided: boolean; bothContinue: boolean } {
  const summary = getLastSummaryByKind(messages, summaryKind);
  const afterId = summary?.id;
  const startIdx = afterId ? messages.findIndex((m) => m.id === afterId) + 1 : 0;
  const ready = new Set<string>();
  for (const m of messages.slice(Math.max(0, startIdx))) {
    if (m.message_type !== 'system') continue;
    const meta = m.metadata;
    if (meta?.action !== SESSION_DECISION_ACTION) continue;
    if (meta.summaryKind !== summaryKind) continue;
    if (meta.decision !== 'continue') continue;
    const uid = meta.userId;
    if (typeof uid === 'string') ready.add(uid);
  }
  const hostDecided = ready.has(hostUserId);
  const partnerDecided =
    partnerUserIds.length === 0 || partnerUserIds.some((id) => ready.has(id));
  return {
    hostDecided,
    partnerDecided,
    bothContinue: hostDecided && partnerDecided,
  };
}

export type ProposalDecisionChoice = 'accepted' | 'rejected';

export interface ProposalDecisionState {
  proposalAcceptedBy: string[];
  hostAccepted: boolean;
  partnerAccepted: boolean;
  hostDecided: boolean;
  partnerDecided: boolean;
  bothAccepted: boolean;
  anyRejected: boolean;
}

export function getProposalDecisionState(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[],
  afterMessageId?: string | null
): ProposalDecisionState {
  const proposed = getLastSummaryByKind(messages, 'proposed_solution');
  const afterId = afterMessageId ?? proposed?.id;
  const startIdx = afterId ? messages.findIndex((m) => m.id === afterId) + 1 : 0;
  const accepted = new Set<string>();
  let anyRejected = false;

  for (const m of messages.slice(Math.max(0, startIdx))) {
    if (m.message_type !== 'system') continue;
    const meta = m.metadata;
    if (meta?.action !== PROPOSAL_DECISION_ACTION) continue;
    if (meta.summaryKind !== 'proposed_solution') continue;
    const uid = meta.userId;
    if (meta.decision === 'rejected') {
      anyRejected = true;
      break;
    }
    if (meta.decision === 'accepted' && typeof uid === 'string') {
      accepted.add(uid);
    }
  }

  const hostAccepted = accepted.has(hostUserId);
  const partnerAccepted =
    partnerUserIds.length === 0 || partnerUserIds.some((id) => accepted.has(id));
  const hostDecided =
    messages.slice(Math.max(0, startIdx)).some(
      (m) =>
        m.message_type === 'system' &&
        m.metadata?.action === PROPOSAL_DECISION_ACTION &&
        m.metadata?.summaryKind === 'proposed_solution' &&
        m.metadata?.userId === hostUserId
    );
  const partnerDecided =
    partnerUserIds.length === 0 ||
    partnerUserIds.some((id) =>
      messages.slice(Math.max(0, startIdx)).some(
        (m) =>
          m.message_type === 'system' &&
          m.metadata?.action === PROPOSAL_DECISION_ACTION &&
          m.metadata?.summaryKind === 'proposed_solution' &&
          m.metadata?.userId === id
      )
    );

  return {
    proposalAcceptedBy: Array.from(accepted),
    hostAccepted,
    partnerAccepted,
    hostDecided,
    partnerDecided,
    bothAccepted: hostAccepted && partnerAccepted,
    anyRejected,
  };
}

export function buildAlternativeProposalMessage(language: Language = 'pl'): string {
  return i18nAlternativeProposal(normalizeAppLanguage(language));
}

export function buildProposalAcceptedFinalMessage(language: Language = 'pl'): string {
  return i18nProposalAccepted(normalizeAppLanguage(language));
}

export function createLocalProposalDecisionMessage(
  mediationId: string,
  userId: string,
  userName: string,
  decision: ProposalDecisionChoice,
  phase: number
): LiveMessage {
  return {
    id: `local-proposal-${decision}-${userId}-${Date.now()}`,
    mediation_id: mediationId,
    sender_id: userId,
    sender_name: userName,
    content: '',
    message_type: 'system',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: {
      action: PROPOSAL_DECISION_ACTION,
      userId,
      decision,
      summaryKind: 'proposed_solution',
    },
    created_at: new Date().toISOString(),
  };
}

export async function signalProposalDecision(
  mediationId: string,
  userId: string,
  userName: string,
  decision: ProposalDecisionChoice,
  phase: number
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: userName,
      content: '',
      message_type: 'system',
      is_private: false,
      phase,
      metadata: {
        action: PROPOSAL_DECISION_ACTION,
        userId,
        decision,
        summaryKind: 'proposed_solution',
      },
    })
    .select('*')
    .single();

  if (error || !data) {
    return createLocalProposalDecisionMessage(
      mediationId,
      userId,
      userName,
      decision,
      phase
    );
  }

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);
  return saved;
}

export function createLocalAiSummaryMessage(
  mediationId: string,
  content: string,
  summaryKind: string,
  phase: number
): LiveMessage {
  return {
    id: `local-ai-summary-${summaryKind}-${Date.now()}`,
    mediation_id: mediationId,
    sender_id: 'ai',
    sender_name: 'Mediator AI',
    content,
    message_type: 'summary',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: { summaryKind },
    created_at: new Date().toISOString(),
  };
}

export async function insertProposalClosureSummary(
  mediationId: string,
  content: string,
  summaryKind: typeof PROPOSAL_ACCEPTED_FINAL_KIND | typeof ALTERNATIVE_SOLUTION_KIND,
  phase: number,
  proposalOutcome: 'accepted' | 'unresolved_but_closed'
): Promise<LiveMessage> {
  await liveMessagesHeaders();
  const { data, error } = await supabase
    .from('live_messages')
    .insert({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content,
      message_type: 'summary',
      is_private: false,
      phase,
      metadata: { summaryKind, proposalOutcome },
    })
    .select('*')
    .single();

  const fallback = createLocalAiSummaryMessage(mediationId, content, summaryKind, phase);
  if (error || !data) return fallback;

  const saved = mapMessage(data);
  invalidateLiveMessagesCache(mediationId);

  const status = proposalOutcome === 'accepted' ? 'resolved' : 'pending_agreements';
  await supabase
    .from('mediations')
    .update({
      status,
      live_progress: 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId);

  return saved;
}

export function isAwaitingProposalDecision(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): boolean {
  if (!hasSummaryKind(messages, 'proposed_solution')) return false;
  if (hasSummaryKind(messages, ALTERNATIVE_SOLUTION_KIND)) return false;
  if (hasSummaryKind(messages, PROPOSAL_ACCEPTED_FINAL_KIND)) return false;

  const proposalState = getProposalDecisionState(messages, hostUserId, partnerUserIds);
  if (proposalState.anyRejected || proposalState.bothAccepted) return false;
  return true;
}
export class LiveMediationRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveMediationRuntimeError';
  }
}

export async function processMediationTurn(
  triggerMessage: LiveMessage,
  hostUserId: string,
  partnerUserIds: string[],
  currentPhase: number,
  allMessages: LiveMessage[],
  currentQuestionIndex = 0,
  language: Language = 'pl',
  mediationContext?: MediationContext | null,
  mode: MediatorMode = 'generate_question',
  participantNames?: ParticipantNames,
  clientEvents?: RuntimeClientEvent[]
): Promise<LiveMediatorResponse> {
  if (mode === 'answer_ack') {
    throw new LiveMediationRuntimeError(
      'answer_ack is runtime-only; use processBothParticipantReplies instead'
    );
  }

  const senderRole = resolveSenderRole(
    triggerMessage.sender_id,
    hostUserId,
    partnerUserIds
  );
  const questionNumber =
    mode === 'generate_question' || mode === 'extension_question'
      ? currentQuestionIndex
      : countAskedQuestions(allMessages);

  const persistedRuntime = await loadMediationRuntimeState(triggerMessage.mediation_id);

  const isSessionBootstrap =
    triggerMessage.metadata?.bootstrap === true || mode === 'opening_summary';

  const mediationStateForTurn =
    persistedRuntime.mediationState ??
    (isSessionBootstrap
      ? buildBootstrapMediationStateFromContext({
          mediationId: triggerMessage.mediation_id,
          sessionId: triggerMessage.mediation_id,
          language: toRuntimeLanguage(language),
          combinedDescription: mediationContext?.combinedDescription,
          partnerCombinedDescription: mediationContext?.partnerCombinedDescription,
          analysis: mediationContext?.analysis ?? null,
          partnerAnalysis: mediationContext?.partnerAnalysis ?? null,
        })
      : null);

  const runtimeTurnInput = buildLiveRuntimeTurnInput({
    mediationId: triggerMessage.mediation_id,
    sessionId: triggerMessage.mediation_id,
    triggerMessageId: triggerMessage.id,
    triggerContent: triggerMessage.content,
    triggerCreatedAt: triggerMessage.created_at,
    mode,
    senderRole,
    language,
    turnNumber: Math.max(1, questionNumber + 1),
    isBootstrap: isSessionBootstrap,
    mediationState: mediationStateForTurn,
    sessionMemory: persistedRuntime.sessionMemory,
    clientEvents: resolveRuntimeClientEventsForTurn({
      messages: allMessages,
      hostUserId,
      partnerUserIds,
      runtimeSession: persistedRuntime.runtimeSession,
      inlineClientEvents: clientEvents,
    }),
    participantNames: participantNames
      ? {
          hostName: participantNames.hostName,
          partnerName: participantNames.partnerName,
        }
      : undefined,
    transcriptWindow: buildLiveTranscriptWindow(allMessages, hostUserId, partnerUserIds),
  });

  let runtimeTurnPersist: MediatorRuntimeParsedSuccess | null = null;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[RUNTIME_REQUEST_START]', {
      mediationId: triggerMessage.mediation_id,
      mode,
      turnNumber: runtimeTurnInput.turnNumber,
      trigger: runtimeTurnInput.trigger,
      isSessionBootstrap,
    });
  }

  const result = await routeLiveMediatorTurn(runtimeTurnInput, {
    callRuntime: async (input) => {
      const parsed = await callMediatorRuntime(input);
      runtimeTurnPersist = parsed;
      return parsed.response;
    },
    onRuntimeFailure: logMediatorRuntimeRolloutFailure,
  });

  if (runtimeTurnPersist) {
    await persistMediationRuntimeState(triggerMessage.mediation_id, runtimeTurnPersist);
  }

  if (
    !result ||
    !(
      result.publicMessage ||
      result.aiQuestion ||
      result.privateHint ||
      result.partnerPrivateHint ||
      result.summaryType
    ) ||
    isStaleLiveEdgeResponse(result) ||
    polishMediatorLeak(language, result)
  ) {
    throw new LiveMediationRuntimeError('Invalid or empty runtime mediator response');
  }

  const normalized = normalizeEdgeResponse(
    result,
    triggerMessage,
    currentPhase,
    currentQuestionIndex
  );
  const textSafe = normalizeMediatorResponseText(normalized);

  if (textSafe.aiQuestion && mode === 'generate_question') {
    textSafe.questionTarget = 'oboje';
    const bare = extractQuestionBare(textSafe.aiQuestion);
    textSafe.aiQuestion = formatQuestionWithTarget(bare, 'oboje', language);
  }

  return textSafe;
}
async function persistMediationRuntimeState(
  mediationId: string,
  parsed: MediatorRuntimeParsedSuccess
): Promise<void> {
  try {
    await prepareSupabaseRequest();
    const { error } = await supabase
      .from('mediations')
      .update(buildMediationRuntimePersistencePatch(parsed.runtime))
      .eq('id', mediationId);

    if (error) {
      console.warn('[liveMediation] persist runtime state failed:', error.message);
    }
  } catch (error) {
    console.warn('[liveMediation] persist runtime state failed:', String(error));
  }
}

export async function pauseLiveMediation(mediationId: string): Promise<void> {
  try {
    await supabase
      .from('mediations')
      .update({
        live_paused: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediationId);

    await liveMessagesHeaders();
    await supabase.from('live_messages').insert({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content:
        'Mediacja wstrzymana. Wróć, gdy będziesz gotowy/a — jesteś w bezpiecznej przestrzeni.',
      message_type: 'system',
      is_private: false,
      phase: 1,
    });
  } catch {
    // Local pause still works in UI.
  }
}

export async function endLiveMediation(
  mediationId: string,
  summary: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await liveMessagesHeaders();
    const { error: insertError } = await supabase.from('live_messages').insert({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content:
        (summary.text as string) ||
        'Dziękuję za otwartą rozmowę. Macie solidne podstawy, by iść dalej razem.',
      message_type: 'summary',
      is_private: false,
      phase: 4,
      metadata: summary,
    });

    if (insertError) {
      console.error('[endLiveMediation] insert:', insertError.message);
    }

    const { error: updateError } = await supabase
      .from('mediations')
      .update({
        status: 'pending_agreements',
        live_summary: summary,
        live_progress: 100,
        live_phase: 4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediationId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Nie udało się zakończyć mediacji.';
    console.error('[endLiveMediation]', msg);
    return { ok: false, error: msg };
  }
}

export async function reportMediationIssue(
  mediationId: string,
  userId: string,
  note: string
): Promise<void> {
  try {
    await liveMessagesHeaders();
    await supabase.from('live_messages').insert({
      mediation_id: mediationId,
      sender_id: userId,
      sender_name: 'Zgłoszenie',
      content: note,
      message_type: 'system',
      is_private: true,
      recipient_id: userId,
      metadata: { report: true },
    });
  } catch {
    // Non-blocking.
  }
}

export { processBothParticipantReplies } from '@/services/mediatorRuntimeClient/processBothParticipantReplies';
