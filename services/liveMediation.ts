import {
  callEdge,
  EDGE,
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
  isMediatorRuntimeEnabled,
  MEDIATOR_RUNTIME_ENGINE_VERSION,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import {
  callMediatorRuntime,
  type MediatorRuntimeParsedSuccess,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
import {
  buildLiveRuntimeTurnInput,
  logMediatorRuntimeRolloutFailure,
  routeLiveMediatorTurn,
  toRuntimeLanguage,
} from '@/services/mediatorRuntimeClient/liveMediationBridge';
import {
  scheduleMediatorShadowRun,
  shouldRunMediatorShadow,
} from '@/services/mediatorShadow';
import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import type { MediationState } from '@/types/mediator/mediationState';
import type { SafetyLevel } from '@/types/mediator/safety';
import type { SessionMemory } from '@/types/mediator/sessionMemory';

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

export type QuestionTarget = 'ty' | 'partner' | 'oboje';

export interface PrivateHint {
  tone?: string;
  emotion?: string;
  suggestion?: string;
}

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
    if (m.metadata?.action === CONVERSATION_STATE_ACTION) {
      return m.metadata.state != null && typeof m.sender_id === 'string';
    }
    return (
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      typeof m.sender_id === 'string'
    );
  });
}

/** Test helper — throws if opening_summary local messages are malformed. */
export function assertOpeningLiveMessages(messages: LiveMessage[]): void {
  const chatMessages = messages.filter(
    (m) => m.metadata?.action !== CONVERSATION_STATE_ACTION
  );
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
  const stateRows = messages.filter((m) => m.metadata?.action === CONVERSATION_STATE_ACTION);
  if (stateRows.length > 0 && stateRows.some((m) => m.metadata?.state == null)) {
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

export interface LiveMediatorResponse {
  publicMessage?: string;
  aiQuestion?: string;
  questionTarget?: QuestionTarget;
  privateHint?: PrivateHint;
  partnerPrivateHint?: PrivateHint;
  funFact?: string;
  source?: string;
  triggerMessageId?: string;
  phaseTransition?: string;
  escalationDetected?: boolean;
  escalationMessage?: string;
  phase?: number;
  progress?: number;
  nextQuestionIndex?: number;
  metaComment?: boolean;
  summaryType?: 'opening' | 'mid' | 'final' | 'extension_check' | 'proposed_solution';
  state?: ConversationState;
}

export type MediatorMode =
  | 'opening_summary'
  | 'generate_question'
  | 'answer_ack'
  | 'mid_summary'
  | 'final_summary'
  | 'extension_check'
  | 'proposed_solution';

export type LiveQuestionPhase = 'opening' | 'deepening' | 'resolution' | 'extension';

export type LiveSessionStage =
  | 'questions'
  | 'awaiting_main_decision'
  | 'extension'
  | 'awaiting_extension_decision'
  | 'awaiting_proposal_decision'
  | 'unresolved_but_closed'
  | 'finished';

export const LIVE_PHASE_OPENING_END = 5;
export const LIVE_PHASE_DEEPENING_END = 10;
export const LIVE_QUESTIONS_TARGET = 15;
export const LIVE_EXTENSION_QUESTIONS = 5;
export const MIN_RESPONSIBILITY_QUESTIONS = 4;
export const MIN_REPAIR_QUESTIONS = 4;
export const READY_NEXT_ACTION = 'ready_next_question';
export const SESSION_DECISION_ACTION = 'session_decision';
export const PROPOSAL_DECISION_ACTION = 'proposal_decision';
export const ALTERNATIVE_SOLUTION_KIND = 'alternative_solution';
export const PROPOSAL_ACCEPTED_FINAL_KIND = 'proposal_accepted_final';
export const EXTENSION_START_ACTION = 'extension_start';
export const GENERATION_LOCK_ACTION = 'generation_lock';
export const CONVERSATION_STATE_ACTION = 'conversation_state';

export type ParticipantNames = { hostName?: string; partnerName?: string };

export type ConversationPhase =
  | 'summary'
  | 'gap_exploration'
  | 'responsibility'
  | 'repair';

export interface IdentifiedGap {
  id: string;
  description: string;
  resolved: boolean;
  discussionRounds: number;
  priority?: number;
  resolutionReason?: string;
  confidence?: number;
  deadlocked?: boolean;
  resolvedByMutualUnderstanding?: boolean;
}

export interface FactMemoryEntry {
  id: string;
  speaker: 'partnerA' | 'partnerB' | 'unknown';
  fact: string;
  relatedGapId?: string;
  confidence: number;
  sourceQuestionIndex?: number;
}

export interface ConversationState {
  phase: ConversationPhase;
  identifiedGaps: IdentifiedGap[];
  activeGapId: string | null;
  openingSummaryDone: boolean;
  mainConflictQuestionAsked: boolean;
  perspectiveA: string;
  perspectiveB: string;
  mainConflict: string;
  coveredTopics: string[];
  lastQuestionSignature: string;
  escalationLevel: number;
  questionCount: number;
  responsibilityQuestionsAsked: number;
  repairQuestionsAsked: number;
  sessionQuestionBudget: number;
  midSummaryShown: boolean;
  responsibilityReady: boolean;
  responsibilityComplete: boolean;
  repairComplete: boolean;
  midSummaryEligible: boolean;
  conversationFinished: boolean;
  singleSidedRounds?: number;
  evasionStreak?: number;
  factMemory?: FactMemoryEntry[];
  stanceHistory?: Array<{
    speaker: 'partnerA' | 'partnerB' | 'unknown';
    claim: string;
    relatedGapId?: string;
    questionIndex?: number;
    timestamp?: string;
  }>;
  contradictions?: Array<{
    speaker: 'partnerA' | 'partnerB' | 'unknown';
    previousClaim: string;
    newClaim: string;
    relatedGapId?: string;
    severity: number;
  }>;
  reconciliationDetected?: boolean;
  reconciliationScore?: number;
  reconciliationReason?: string;
  emotionalResolutionDetected?: boolean;
  reconciliationRepairOffered?: boolean;
  gapExplorationStep?: number;
  repairStep?: number;
  currentQuestion?: {
    id: string;
    phase: string;
    topic: string;
    askedAtQuestionNumber: number;
    answered: boolean;
  };
  finalCommitments?: {
    partnerA?: string;
    partnerB?: string;
    sharedRule?: string;
    fallbackPlan?: string;
  };
}

export function createDefaultConversationState(): ConversationState {
  return {
    phase: 'summary',
    identifiedGaps: [],
    activeGapId: null,
    openingSummaryDone: false,
    mainConflictQuestionAsked: false,
    perspectiveA: '',
    perspectiveB: '',
    mainConflict: '',
    coveredTopics: [],
    lastQuestionSignature: '',
    escalationLevel: 0,
    questionCount: 0,
    responsibilityQuestionsAsked: 0,
    repairQuestionsAsked: 0,
    sessionQuestionBudget: 10,
    midSummaryShown: false,
    responsibilityReady: false,
    responsibilityComplete: false,
    repairComplete: false,
    midSummaryEligible: false,
    conversationFinished: false,
  };
}

export function getSessionQuestionBudget(messages: LiveMessage[]): number {
  const state = getConversationState(messages);
  return state.sessionQuestionBudget >= 10 ? state.sessionQuestionBudget : LIVE_QUESTIONS_TARGET;
}

export function getConversationState(messages: LiveMessage[]): ConversationState {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.metadata?.action === CONVERSATION_STATE_ACTION && m.metadata?.state) {
      return normalizeConversationState(m.metadata.state);
    }
  }
  if (hasSummaryKind(messages, 'opening_summary')) {
    return {
      ...createDefaultConversationState(),
      openingSummaryDone: true,
      phase: 'gap_exploration',
      questionCount: countAskedQuestions(messages),
    };
  }
  return createDefaultConversationState();
}

function normalizeIdentifiedGaps(raw: unknown): IdentifiedGap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g === 'object')
    .map((g) => {
      const item = g as Partial<IdentifiedGap>;
      return {
        id: typeof item.id === 'string' ? item.id : '',
        description: typeof item.description === 'string' ? item.description : '',
        resolved: Boolean(item.resolved),
        discussionRounds:
          typeof item.discussionRounds === 'number' && item.discussionRounds >= 0
            ? item.discussionRounds
            : 0,
        deadlocked: Boolean(item.deadlocked),
        resolvedByMutualUnderstanding: Boolean(item.resolvedByMutualUnderstanding),
        resolutionReason:
          typeof item.resolutionReason === 'string' ? item.resolutionReason : undefined,
        confidence:
          typeof item.confidence === 'number' ? item.confidence : undefined,
      };
    })
    .filter((g) => g.id && g.description)
    .slice(0, 8);
}

function normalizeConversationState(raw: unknown): ConversationState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<ConversationState>;
  const phases: ConversationPhase[] = [
    'summary',
    'gap_exploration',
    'responsibility',
    'repair',
  ];
  const phase = phases.includes(s.phase as ConversationPhase)
    ? (s.phase as ConversationPhase)
    : 'summary';
  return {
    phase,
    identifiedGaps: normalizeIdentifiedGaps(s.identifiedGaps),
    activeGapId: typeof s.activeGapId === 'string' ? s.activeGapId : null,
    openingSummaryDone: Boolean(s.openingSummaryDone),
    mainConflictQuestionAsked:
      Boolean(s.mainConflictQuestionAsked) ||
      (typeof s.questionCount === 'number' && s.questionCount > 0),
    perspectiveA: typeof s.perspectiveA === 'string' ? s.perspectiveA : '',
    perspectiveB: typeof s.perspectiveB === 'string' ? s.perspectiveB : '',
    mainConflict: typeof s.mainConflict === 'string' ? s.mainConflict : '',
    coveredTopics: Array.isArray(s.coveredTopics)
      ? s.coveredTopics.filter((t) => typeof t === 'string').slice(-12)
      : [],
    lastQuestionSignature:
      typeof s.lastQuestionSignature === 'string' ? s.lastQuestionSignature : '',
    escalationLevel: typeof s.escalationLevel === 'number' ? s.escalationLevel : 0,
    questionCount: typeof s.questionCount === 'number' ? s.questionCount : 0,
    responsibilityQuestionsAsked:
      typeof s.responsibilityQuestionsAsked === 'number' && s.responsibilityQuestionsAsked >= 0
        ? s.responsibilityQuestionsAsked
        : 0,
    repairQuestionsAsked:
      typeof s.repairQuestionsAsked === 'number' && s.repairQuestionsAsked >= 0
        ? s.repairQuestionsAsked
        : 0,
    sessionQuestionBudget:
      typeof s.sessionQuestionBudget === 'number' && s.sessionQuestionBudget >= 10
        ? Math.min(25, s.sessionQuestionBudget)
        : 10,
    midSummaryShown: Boolean(s.midSummaryShown),
    responsibilityReady: Boolean(s.responsibilityReady),
    responsibilityComplete: Boolean(s.responsibilityComplete),
    repairComplete: Boolean(s.repairComplete),
    midSummaryEligible: Boolean(s.midSummaryEligible),
    conversationFinished: Boolean(s.conversationFinished),
    evasionStreak:
      typeof s.evasionStreak === 'number' && s.evasionStreak >= 0 ? s.evasionStreak : 0,
    reconciliationDetected: Boolean(s.reconciliationDetected),
    reconciliationScore:
      typeof s.reconciliationScore === 'number' && s.reconciliationScore >= 0
        ? s.reconciliationScore
        : undefined,
    reconciliationReason:
      typeof s.reconciliationReason === 'string' ? s.reconciliationReason : undefined,
    emotionalResolutionDetected: Boolean(s.emotionalResolutionDetected),
    reconciliationRepairOffered: Boolean(s.reconciliationRepairOffered),
    gapExplorationStep:
      typeof s.gapExplorationStep === 'number' && s.gapExplorationStep >= 0
        ? s.gapExplorationStep
        : 0,
    repairStep: typeof s.repairStep === 'number' && s.repairStep >= 0 ? s.repairStep : 0,
    currentQuestion:
      s.currentQuestion &&
      typeof s.currentQuestion === 'object' &&
      typeof (s.currentQuestion as { id?: string }).id === 'string'
        ? {
            id: (s.currentQuestion as { id: string }).id,
            phase:
              typeof (s.currentQuestion as { phase?: string }).phase === 'string'
                ? (s.currentQuestion as { phase: string }).phase
                : 'gap',
            topic:
              typeof (s.currentQuestion as { topic?: string }).topic === 'string'
                ? (s.currentQuestion as { topic: string }).topic
                : (s.currentQuestion as { id: string }).id,
            askedAtQuestionNumber:
              typeof (s.currentQuestion as { askedAtQuestionNumber?: number })
                .askedAtQuestionNumber === 'number'
                ? (s.currentQuestion as { askedAtQuestionNumber: number }).askedAtQuestionNumber
                : 0,
            answered: Boolean((s.currentQuestion as { answered?: boolean }).answered),
          }
        : undefined,
    finalCommitments:
      s.finalCommitments && typeof s.finalCommitments === 'object'
        ? {
            partnerA:
              typeof (s.finalCommitments as { partnerA?: string }).partnerA === 'string'
                ? (s.finalCommitments as { partnerA: string }).partnerA
                : undefined,
            partnerB:
              typeof (s.finalCommitments as { partnerB?: string }).partnerB === 'string'
                ? (s.finalCommitments as { partnerB: string }).partnerB
                : undefined,
            sharedRule:
              typeof (s.finalCommitments as { sharedRule?: string }).sharedRule === 'string'
                ? (s.finalCommitments as { sharedRule: string }).sharedRule
                : undefined,
            fallbackPlan:
              typeof (s.finalCommitments as { fallbackPlan?: string }).fallbackPlan === 'string'
                ? (s.finalCommitments as { fallbackPlan: string }).fallbackPlan
                : undefined,
          }
        : undefined,
  };
}

export function getPrimaryUnresolvedGap(state: ConversationState): IdentifiedGap | null {
  return state.identifiedGaps.find((g) => !g.resolved) ?? null;
}

export function hasUnresolvedGaps(messages: LiveMessage[]): boolean {
  const state = getConversationState(messages);
  return state.identifiedGaps.some((g) => !g.resolved);
}

export function isReadyForFinalSummary(state: ConversationState): boolean {
  const repairDone =
    state.repairComplete ||
    (state.repairStep ?? 0) >= 3 ||
    state.repairQuestionsAsked >= 3;
  return (
    (state.conversationFinished || repairDone) &&
    !state.identifiedGaps.some((g) => !g.resolved) &&
    state.mainConflictQuestionAsked &&
    (state.responsibilityQuestionsAsked >= 4 || Boolean(state.reconciliationDetected)) &&
    (state.responsibilityComplete || Boolean(state.reconciliationDetected)) &&
    repairDone
  );
}

export function isReadyForProposedSolution(state: ConversationState): boolean {
  return (
    state.repairComplete ||
    state.conversationFinished ||
    (state.repairStep ?? 0) >= 3 ||
    state.currentQuestion?.id === 'repair_stress_test'
  );
}

export function isReadyForMidSummary(state: ConversationState): boolean {
  return (
    !state.identifiedGaps.some((g) => !g.resolved) &&
    state.responsibilityQuestionsAsked >= 1 &&
    state.questionCount >= Math.floor(state.sessionQuestionBudget / 2) &&
    !state.midSummaryShown
  );
}

export async function persistConversationState(
  mediationId: string,
  state: ConversationState,
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
      metadata: { action: CONVERSATION_STATE_ACTION, state },
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      id: `local-state-${Date.now()}`,
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: '',
      message_type: 'system',
      is_private: false,
      recipient_id: null,
      phase,
      metadata: { action: CONVERSATION_STATE_ACTION, state },
      created_at: new Date().toISOString(),
    };
  }
  invalidateLiveMessagesCache(mediationId);
  return mapMessage(data);
}

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

export interface LiveSessionFlow {
  stage: LiveSessionStage;
  questionNumber: number;
  maxQuestions: number;
  questionPhase: LiveQuestionPhase;
  extensionActive: boolean;
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

function toughQuestionPool(lang: Language = 'pl'): string[] {
  return [...liveStrings(lang).toughQuestionPool];
}

function pickOpeningQuestion(ctx: MediationContext | null, lang: Language = 'pl'): string {
  return buildContextualQuestion(ctx, [], [], 1, lang);
}

export function getLastQuestionMessage(messages: LiveMessage[]): LiveMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].message_type === 'question') return messages[i];
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
  return messages.filter((m) => m.message_type === 'question').length;
}

export function extractQuestionBare(content: string): string {
  const text = typeof content === 'string' ? content : String(content ?? '');
  return text.replace(/^🎯\s*@[^:]+:\s*/i, '').trim();
}

export function getAskedQuestionTexts(messages: LiveMessage[]): string[] {
  return messages
    .filter((m) => m.message_type === 'question')
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

export function shouldSkipOpeningBootstrap(
  messages: LiveMessage[],
  conversationState?: ConversationState | null
): boolean {
  return (
    hasOpeningSummaryMessage(messages) ||
    hasOpeningFactsQuestion(messages) ||
    Boolean(conversationState?.openingSummaryDone)
  );
}

/** Czy wskazówki po danym pytaniu zostały już wysłane. */
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

function sanitizeAnswerAckResponse(response: LiveMediatorResponse): LiveMediatorResponse {
  return {
    ...response,
    publicMessage: undefined,
    aiQuestion: undefined,
    summaryType: undefined,
    phaseTransition: undefined,
    funFact: undefined,
  };
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
  const after = getMessagesAfterQuestion(messages, lastQuestion);

  const hostAnswered = lastQuestion
    ? after.some((m) => m.message_type === 'message' && m.sender_id === hostUserId)
    : false;

  const partnerAnswered = !lastQuestion
    ? false
    : partnerUserIds.length === 0
      ? false
      : after.some(
          (m) =>
            m.message_type === 'message' &&
            partnerUserIds.includes(m.sender_id)
        );

  const readyIds = getReadyUserIds(messages, lastQuestion?.id ?? null);

  const hostReady = readyIds.has(hostUserId);
  const partnerReady =
    partnerUserIds.length === 0
      ? false
      : partnerUserIds.some((id) => readyIds.has(id));

  const bothAnswered = lastQuestion ? hostAnswered && partnerAnswered : false;

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

export function getQuestionPhase(
  questionNumber: number,
  extensionActive: boolean,
  conversationState?: ConversationState | null
): LiveQuestionPhase {
  if (extensionActive) return 'extension';
  if (conversationState) {
    if (!conversationState.openingSummaryDone || !conversationState.mainConflictQuestionAsked) {
      return 'opening';
    }
    if (conversationState.identifiedGaps.some((g) => !g.resolved)) {
      return 'deepening';
    }
    return 'resolution';
  }
  if (questionNumber <= LIVE_PHASE_OPENING_END) return 'opening';
  if (questionNumber <= LIVE_PHASE_DEEPENING_END) return 'deepening';
  return 'resolution';
}

export function getMediatorPhaseLabel(
  state: ConversationState | null | undefined,
  lang: Language = 'pl',
  options?: { extensionActive?: boolean; conversationFinished?: boolean }
): string | null {
  if (!state) return null;
  if (options?.extensionActive) {
    return lang === 'en' ? 'Extension' : 'Rozszerzenie';
  }
  if (!state.openingSummaryDone) {
    return lang === 'en' ? 'Summary' : 'Podsumowanie';
  }
  if (!state.mainConflictQuestionAsked) {
    return lang === 'en' ? 'Establishing facts' : 'Ustalanie faktów';
  }
  if (state.identifiedGaps.some((g) => !g.resolved)) {
    return lang === 'en' ? 'Clarifying differences' : 'Wyjaśnianie różnic';
  }
  if (state.responsibilityQuestionsAsked < MIN_RESPONSIBILITY_QUESTIONS) {
    return lang === 'en' ? 'Responsibility' : 'Odpowiedzialność';
  }
  if (state.repairQuestionsAsked < MIN_REPAIR_QUESTIONS) {
    return lang === 'en' ? 'Repair' : 'Naprawa';
  }
  if (options?.conversationFinished ?? state.conversationFinished) {
    return lang === 'en' ? 'Final summary' : 'Podsumowanie końcowe';
  }
  return lang === 'en' ? 'Wrap-up' : 'Domykanie';
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

export function computeLiveSessionFlow(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): LiveSessionFlow {
  const questionNumber = countAskedQuestions(messages);
  const extensionActive = isExtensionActive(messages);
  const conversationState = getConversationState(messages);
  const baseBudget = getSessionQuestionBudget(messages);
  const maxQuestions = extensionActive
    ? baseBudget + LIVE_EXTENSION_QUESTIONS
    : baseBudget;
  const questionPhase = getQuestionPhase(
    extensionActive ? Math.max(questionNumber, baseBudget + 1) : questionNumber,
    extensionActive,
    conversationState
  );

  if (hasSummaryKind(messages, 'proposed_solution')) {
    if (hasSummaryKind(messages, ALTERNATIVE_SOLUTION_KIND)) {
      return {
        stage: 'unresolved_but_closed',
        questionNumber,
        maxQuestions,
        questionPhase,
        extensionActive,
      };
    }
    if (hasSummaryKind(messages, PROPOSAL_ACCEPTED_FINAL_KIND)) {
      return {
        stage: 'finished',
        questionNumber,
        maxQuestions,
        questionPhase,
        extensionActive,
      };
    }
    const proposed = getLastSummaryByKind(messages, 'proposed_solution');
    const proposalState = getProposalDecisionState(
      messages,
      hostUserId,
      partnerUserIds,
      proposed?.id
    );
    if (proposalState.anyRejected) {
      return {
        stage: 'unresolved_but_closed',
        questionNumber,
        maxQuestions,
        questionPhase,
        extensionActive,
      };
    }
    if (proposalState.bothAccepted) {
      return {
        stage: 'finished',
        questionNumber,
        maxQuestions,
        questionPhase,
        extensionActive,
      };
    }
    return {
      stage: 'awaiting_proposal_decision',
      questionNumber,
      maxQuestions,
      questionPhase,
      extensionActive,
    };
  }

  const finalSummary = getLastSummaryByKind(messages, 'final_summary');
  if (finalSummary && !extensionActive) {
    const resolved = hasSessionDecisionAfter(
      messages,
      'final_summary',
      'resolved',
      finalSummary.id
    );
    const bothContinue = bothPartnersDecided(
      messages,
      'final_summary',
      'continue',
      hostUserId,
      partnerUserIds,
      finalSummary.id
    );
    if (!resolved && !bothContinue) {
      return {
        stage: 'awaiting_main_decision',
        questionNumber,
        maxQuestions: baseBudget,
        questionPhase: 'resolution',
        extensionActive: false,
      };
    }
    if (bothContinue && !isExtensionActive(messages)) {
      return {
        stage: 'questions',
        questionNumber,
        maxQuestions: baseBudget + LIVE_EXTENSION_QUESTIONS,
        questionPhase: 'extension',
        extensionActive: false,
      };
    }
  }

  const extensionCheck = getLastSummaryByKind(messages, 'extension_check');
  if (extensionCheck) {
    const resolved = hasSessionDecisionAfter(
      messages,
      'extension_check',
      'resolved',
      extensionCheck.id
    );
    const bothContinue = bothPartnersDecided(
      messages,
      'extension_check',
      'continue',
      hostUserId,
      partnerUserIds,
      extensionCheck.id
    );
    if (!resolved && !bothContinue) {
      return {
        stage: 'awaiting_extension_decision',
        questionNumber,
        maxQuestions,
        questionPhase: 'extension',
        extensionActive: true,
      };
    }
    if (bothContinue && !hasSummaryKind(messages, 'proposed_solution')) {
      return {
        stage: 'extension',
        questionNumber,
        maxQuestions,
        questionPhase: 'extension',
        extensionActive: true,
      };
    }
  }

  if (extensionActive) {
    return {
      stage:
        questionNumber >= baseBudget + LIVE_EXTENSION_QUESTIONS
          ? 'awaiting_extension_decision'
          : 'extension',
      questionNumber,
      maxQuestions,
      questionPhase: 'extension',
      extensionActive: true,
    };
  }

  return {
    stage: 'questions',
    questionNumber,
    maxQuestions: baseBudget,
    questionPhase: getQuestionPhase(questionNumber, false, conversationState),
    extensionActive: false,
  };
}

export function resolveGenerateMode(
  turn: LiveTurnState,
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): MediatorMode | null {
  if (!hasSummaryKind(messages, 'opening_summary')) {
    return 'opening_summary';
  }

  if (turn.questionNumber === 0) {
    return 'generate_question';
  }

  if (isAwaitingProposalDecision(messages, hostUserId, partnerUserIds)) {
    return null;
  }

  if (!turn.bothAnswered) return null;

  const flow = computeLiveSessionFlow(messages, hostUserId, partnerUserIds);
  if (flow.stage === 'awaiting_main_decision' || flow.stage === 'awaiting_extension_decision') {
    return null;
  }
  if (flow.stage === 'finished') return null;

  const q = turn.questionNumber;
  const extensionActive = flow.extensionActive;

  // Po final_summary — zero kolejnych pytań dopóki nie wystartuje extension.
  if (hasSummaryKind(messages, 'final_summary') && !extensionActive) {
    return null;
  }

  if (
    !extensionActive &&
    !turn.midSummaryShown &&
    !hasUnresolvedGaps(messages)
  ) {
    const convState = getConversationState(messages);
    if (isReadyForMidSummary(convState)) {
      return 'mid_summary';
    }
  }

  if (!extensionActive && !turn.proposedSolutionShown) {
    const convState = getConversationState(messages);
    if (isReadyForProposedSolution(convState)) {
      return 'proposed_solution';
    }
  }

  if (!extensionActive && !turn.finalSummaryShown) {
    const convState = getConversationState(messages);
    if (isReadyForFinalSummary(convState)) {
      return 'final_summary';
    }
  }

  const baseBudget = getSessionQuestionBudget(messages);

  if (
    extensionActive &&
    q >= baseBudget + LIVE_EXTENSION_QUESTIONS &&
    !turn.extensionCheckShown
  ) {
    return 'extension_check';
  }

  const extensionCheck = getLastSummaryByKind(messages, 'extension_check');
  if (
    extensionCheck &&
    bothPartnersDecided(
      messages,
      'extension_check',
      'continue',
      hostUserId,
      partnerUserIds,
      extensionCheck.id
    ) &&
    !turn.proposedSolutionShown
  ) {
    return 'proposed_solution';
  }

  if (!hasSummaryKind(messages, 'final_summary') || extensionActive) {
    return 'generate_question';
  }

  return null;
}

function questionTokens(text: string): Set<string> {
  const bare = extractQuestionBare(text).toLowerCase();
  return new Set(
    bare
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

export function isQuestionTooSimilar(
  newQuestion: string,
  askedQuestions: string[],
  threshold = 0.42
): boolean {
  const newTokens = questionTokens(newQuestion);
  if (newTokens.size < 3) return false;

  for (const prev of askedQuestions) {
    const prevTokens = questionTokens(prev);
    if (prevTokens.size === 0) continue;
    let overlap = 0;
    for (const t of newTokens) {
      if (prevTokens.has(t)) overlap++;
    }
    const similarity = overlap / Math.min(newTokens.size, prevTokens.size);
    if (similarity >= threshold) return true;
  }
  return false;
}

function progressFromQuestionCount(n: number, max = LIVE_QUESTIONS_TARGET): number {
  return Math.min(100, Math.max(5, Math.round((n / max) * 100)));
}

const AGGRESSIVE_PATTERNS = [
  /ty zawsze/i,
  /ty nigdy/i,
  /jesteś (?:głup|leniw|egoist|niemił)/i,
  /zamilcz/i,
  /nie interesuje mnie/i,
  /sam\/sama sobie/i,
];

const DEFENSIVE_PATTERNS = [
  /nie moja wina/i,
  /to przez ciebie/i,
  /sam\/sama/i,
  /nie ja/i,
  /zawsze mnie obwiniasz/i,
];

const EMOTION_PATTERNS = [
  /czuję/i,
  /czuje/i,
  /smutn/i,
  /zdenerwow/i,
  /wkurz/i,
  /ból/i,
  /bolesn/i,
  /lęk/i,
  /samotn/i,
  /rani/i,
];

const NEED_PATTERNS = [
  /potrzebuj/i,
  /chciałbym/i,
  /chciałabym/i,
  /chcę/i,
  /chce/i,
  /ważne dla mnie/i,
  /zależy mi/i,
  /brakuje mi/i,
];

const UNDERSTANDING_PATTERNS = [
  /rozumiem/i,
  /słyszę/i,
  /widzę że/i,
  /widze ze/i,
  /doceniam/i,
  /przepraszam/i,
  /masz rację/i,
];

const SOLUTION_PATTERNS = [
  /możemy/i,
  /mozemy/i,
  /proponuj/i,
  /ustalmy/i,
  /zgadzam/i,
  /spróbujmy/i,
  /sprobujmy/i,
  /kompromis/i,
];

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

function extractQuote(text: string, maxLen = 42): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

function isShortOrVague(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length < 6 || text.trim().length < 28;
}

function isEvasiveReply(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return /^(tak|nic|ok|okej|test|no|nie|hm+|mhm)\.?$/i.test(trimmed);
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

function extractQuoteForQuestion(text: string, maxLen = 48): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

export function buildContextualQuestion(
  ctx: MediationContext | null | undefined,
  recentAnswers: string[],
  askedQuestions: string[],
  questionNumber: number,
  lang: Language = 'pl',
  questionPhase: LiveQuestionPhase = 'opening'
): string {
  const analysis = ctx?.analysis ?? null;
  const trigger = stringFromAnalysisField(analysis, 'key_trigger');
  const summary = stringFromAnalysisField(
    analysis,
    'situation_summary',
    'core_conflict',
    'perspective_gap_detail',
    'misunderstanding'
  );
  const gap = stringFromAnalysisField(
    analysis,
    'perspective_gap_detail',
    'perspective_gap_title',
    'misunderstanding'
  );
  const improve = stringFromAnalysisField(analysis, 'what_could_improve');
  const combined = ctx?.combinedDescription?.trim() || '';
  const partnerCombined = ctx?.partnerCombinedDescription?.trim() || '';
  const used = new Set(askedQuestions.map((q) => q.toLowerCase().trim()));

  const pickFirstUnique = (items: string[]): string | null => {
    for (const candidate of items) {
      if (used.has(candidate.toLowerCase().trim())) continue;
      if (isQuestionTooSimilar(candidate, askedQuestions)) continue;
      return candidate;
    }
    return null;
  };

  const openingCandidates: string[] = [];
  const deepeningCandidates: string[] = [];
  const resolutionCandidates: string[] = [];
  const extensionCandidates: string[] = [];

  if (lang === 'en') {
    if (trigger) {
      openingCandidates.push(
        `What exactly happened when «${extractQuoteForQuestion(trigger, 72)}» — who said what, in order?`,
        `«${extractQuoteForQuestion(trigger, 60)}» keeps coming up. What did each of you want in that moment — not what you felt, what you wanted?`
      );
    }
    if (summary) {
      openingCandidates.push(
        `Describe the dispute in one sentence each — no blame words, only facts: «${extractQuoteForQuestion(summary, 60)}».`
      );
    }
    if (gap) {
      deepeningCandidates.push(
        `You disagree on: «${extractQuoteForQuestion(gap, 70)}». What evidence does each of you have for your version?`
      );
    }
    if (recentAnswers.length >= 2) {
      deepeningCandidates.push(
        `One said «${extractQuoteForQuestion(recentAnswers.at(-2) || '', 42)}», the other «${extractQuoteForQuestion(recentAnswers.at(-1) || '', 42)}». What is the ONE fact you both still avoid naming?`
      );
    }
    if (improve) {
      resolutionCandidates.push(
        `Improvement needed: «${extractQuoteForQuestion(improve, 70)}». What will each of you do differently in the next 48 hours — specific action?`
      );
    }
    resolutionCandidates.push(
      `What measurable promise can each of you make for the next 7 days — not «I will try»?`,
      `What would each of you need to hear or see from the other to consider this fight closed?`
    );
    extensionCandidates.push(
      `What still blocks resolution after everything you said — name the real obstacle, not the symptom.`,
      `What must each of you give up or change for this fight to end — be specific.`,
      `If nothing changes, what happens to the relationship in 3 months — honest answer from each.`
    );
  } else {
    if (trigger) {
      openingCandidates.push(
        `Co dokładnie się stało, gdy «${extractQuoteForQuestion(trigger, 72)}» — kto co powiedział, po kolei?`,
        `«${extractQuoteForQuestion(trigger, 60)}» wraca w analizie. Czego każde z was wtedy chciało — nie co czuło, czego chciało?`
      );
    }
    if (summary) {
      openingCandidates.push(
        `Opiszcie spór jednym zdaniem każde — bez słów „zawsze” i „nigdy»: «${extractQuoteForQuestion(summary, 60)}».`
      );
    }
    if (gap) {
      deepeningCandidates.push(
        `Nie zgadzacie się co do: «${extractQuoteForQuestion(gap, 70)}». Jakie macie dowody na swoją wersję — konkretnie?`
      );
    }
    if (recentAnswers.length >= 2) {
      deepeningCandidates.push(
        `Jedno z was: «${extractQuoteForQuestion(recentAnswers.at(-2) || '', 42)}», drugie: «${extractQuoteForQuestion(recentAnswers.at(-1) || '', 42)}». Jaki JEDEN fakt wciąż omijacie?`
      );
    }
    if (combined) {
      deepeningCandidates.push(
        `Przeczytajcie własny opis kłótni. Czego każde z was nie chce przyznać co do swojej roli?`
      );
    }
    if (partnerCombined) {
      deepeningCandidates.push(
        `Partner opisał to inaczej. Którą część jego/jej wersji odrzucacie — i co by musiało być prawdą, żeby miał/a rację?`
      );
    }
    if (improve) {
      resolutionCandidates.push(
        `Do poprawy: «${extractQuoteForQuestion(improve, 70)}». Co każde z was zrobi inaczej w ciągu 48 godzin — jeden konkretny krok?`
      );
    }
    resolutionCandidates.push(
      `Jaką mierzalną obietnicę dajecie na 7 dni — nie «postaram się»?`,
      `Czego każde z was potrzebuje usłyszeć lub zobaczyć od drugiej strony, żeby uznać spór za zamknięty?`
    );
    extensionCandidates.push(
      `Co wciąż blokuje rozwiązanie po całej tej rozmowie — nazwijcie prawdziwą przeszkodę, nie objaw.`,
      `Czego każde z was musi zrezygnować lub zmienić, żeby ten spór się skończył — konkretnie.`,
      `Jeśli nic się nie zmieni — co stanie się z relacją za 3 miesiące? Szczera odpowiedź od każdego.`
    );
  }

  const phasePools: Record<LiveQuestionPhase, string[]> = {
    opening: openingCandidates,
    deepening: deepeningCandidates,
    resolution: resolutionCandidates,
    extension: extensionCandidates,
  };

  const primary = pickFirstUnique(phasePools[questionPhase] || []);
  if (primary) return primary;

  const fallbackPool = [
    ...phasePools[questionPhase],
    ...phasePools.deepening,
    ...phasePools.resolution,
    ...phasePools.opening,
  ];
  const fallback = pickFirstUnique(fallbackPool);
  if (fallback) return fallback;

  const generic =
    lang === 'en'
      ? questionPhase === 'extension'
        ? 'What must change in each of your behaviors for this fight to actually end?'
        : questionPhase === 'resolution'
          ? 'What concrete step will each of you take this week — name it with a date?'
          : questionPhase === 'deepening'
            ? 'What contradiction in your answers are you both pretending not to see?'
            : 'What happened first in this fight — before emotions took over?'
      : questionPhase === 'extension'
        ? 'Co musi się zmienić w zachowaniu każdego z was, żeby ten spór naprawdę się skończył?'
        : questionPhase === 'resolution'
          ? 'Jaki konkretny krok zrobicie w tym tygodniu — z datą?'
          : questionPhase === 'deepening'
            ? 'Jaką sprzeczność w waszych odpowiedziach oboje udajecie, że nie widzicie?'
            : 'Co było pierwsze w tej kłótni — zanim weszły emocje?';

  return generic;
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

function detectAccusation(text: string): boolean {
  return /ty zawsze|ty nigdy|zawsze ty|nigdy ty|znowu ty|ty decydujesz|decydujesz sam|sam decydujesz/i.test(
    text
  );
}

const META_ADD_MORE_QUESTION = 'Czy chcesz dodać coś jeszcze';

function findLastAiPublicMessage(messages: LiveMessage[]): LiveMessage | null {
  return (
    [...messages]
      .reverse()
      .find(
        (m) =>
          m.sender_id === 'ai' &&
          !m.is_private &&
          (m.message_type === 'system' || m.message_type === 'question')
      ) ?? null
  );
}

function isMetaFollowupDecline(text: string, allMessages: LiveMessage[]): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!/^nie[\s.!?,]*$|^no[\s.!?,]*$/i.test(trimmed)) return false;
  const lastAi = findLastAiPublicMessage(allMessages);
  return lastAi?.content.includes(META_ADD_MORE_QUESTION) ?? false;
}

function detectMetaComment(text: string, allMessages?: LiveMessage[]): boolean {
  if (allMessages && isMetaFollowupDecline(text, allMessages)) return true;
  const lower = text.toLowerCase();
  return (
    /\b(juz|już)\b/.test(lower) ||
    /napisalem|napisałem|napisalam|napisałam/.test(lower) ||
    /powtarzam|to samo|mowilem|mówiłem|mowilam|mówiłam|juz to|już to|already said/i.test(
      lower
    )
  );
}

export interface LastMessageAnalysis {
  message: LiveMessage | null;
  metaComment: boolean;
  sentiment: Sentiment;
}

export function analyzeLastMessage(
  allMessages: LiveMessage[],
  hostUserId: string
): LastMessageAnalysis {
  const message =
    [...allMessages]
      .reverse()
      .find((m) => m.message_type === 'message' && m.sender_id === hostUserId) ?? null;

  if (!message) {
    return { message: null, metaComment: false, sentiment: 'neutral' };
  }

  const metaComment = detectMetaComment(message.content, allMessages);
  const sentiment = metaComment ? 'neutral' : analyzeSentiment(message.content);
  return { message, metaComment, sentiment };
}

function getQuestionByIndex(index: number, lang: Language = 'pl'): string {
  const flow = questionFlow(lang);
  const safe = Math.max(0, Math.min(index, flow.length - 1));
  return flow[safe];
}

function determineQuestionTarget(
  triggerMessage: LiveMessage,
  hostUserId: string,
  partnerUserIds: string[],
  phase: number,
  allMessages: LiveMessage[]
): QuestionTarget {
  const isFromPartner = partnerUserIds.includes(triggerMessage.sender_id);
  const hostDone = participantCompletedPhase(allMessages, [hostUserId], phase);
  const partnerDone =
    partnerUserIds.length === 0
      ? hostDone
      : participantCompletedPhase(allMessages, partnerUserIds, phase);

  if (!hostDone && !partnerDone) return 'oboje';
  if (isFromPartner) return hostDone ? 'oboje' : 'ty';
  if (partnerUserIds.length === 0) return 'ty';
  return partnerDone ? 'oboje' : 'partner';
}

export function getDefaultQuestion(_phase = 1, lang: Language = 'pl'): string {
  return questionFlow(lang)[0];
}

export function getPhaseLabel(
  phase: number,
  lang: Language = 'pl',
  flow?: LiveSessionFlow | null,
  conversationStateOrMessages?: ConversationState | LiveMessage[] | null
): string {
  const ui = getLiveMediationExtras(lang).live;
  const max = flow?.maxQuestions ?? LIVE_QUESTIONS_TARGET;
  const n = Math.min(Math.max(phase, 1), max);
  const base = fmt(ui.questionLabel, { n: String(n), total: String(max) });
  const conversationState = Array.isArray(conversationStateOrMessages)
    ? getConversationState(conversationStateOrMessages)
    : conversationStateOrMessages ?? null;
  const stateLabel = getMediatorPhaseLabel(conversationState, lang, {
    extensionActive: flow?.extensionActive,
    conversationFinished: conversationState?.conversationFinished,
  });
  if (stateLabel) return `${base} · ${stateLabel}`;
  if (!flow) return base;
  const phaseLabels = ui.phaseLabels;
  const phaseName = phaseLabels?.[flow.questionPhase];
  return phaseName ? `${base} · ${phaseName}` : base;
}

export function getPhaseTransitionMessage(newPhase: number, lang: Language = 'pl'): string {
  const ui = getLiveMediationExtras(lang).live;
  return fmt(ui.questionLabel, {
    n: String(Math.min(newPhase, LIVE_QUESTIONS_TARGET)),
    total: String(LIVE_QUESTIONS_TARGET),
  });
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

export function createMockQuestionMessage(mediationId: string): LiveMessage {
  const question = getDefaultQuestion(1);
  const content = formatQuestionWithTarget(question, 'oboje');
  return {
    id: `mock-question-${Date.now()}`,
    mediation_id: mediationId,
    sender_id: 'ai',
    sender_name: 'Mediator AI',
    content,
    message_type: 'question',
    is_private: false,
    recipient_id: null,
    phase: 1,
    metadata: { questionTarget: 'oboje' },
    created_at: new Date().toISOString(),
  };
}

export function detectEscalation(text: string): boolean {
  return AGGRESSIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

type Sentiment = 'aggressive' | 'defensive' | 'constructive' | 'upset' | 'neutral' | 'vague' | 'meta';

export function analyzeSentiment(text: string, allMessages?: LiveMessage[]): Sentiment {
  if (detectMetaComment(text, allMessages)) return 'meta';
  if (detectEscalation(text) || detectAccusation(text)) return 'aggressive';
  if (matchesAny(text, DEFENSIVE_PATTERNS)) return 'defensive';
  if (matchesAny(text, EMOTION_PATTERNS)) {
    return 'constructive';
  }
  if (matchesAny(text, UNDERSTANDING_PATTERNS) || /dziękuję|dziekuje/i.test(text)) {
    return 'constructive';
  }
  if (isShortOrVague(text)) return 'vague';
  if (matchesAny(text, [/zdenerwow/i, /wkurz/i, /płacz/i, /placz/i, /nie fair/i])) {
    return 'upset';
  }
  return 'neutral';
}

export function buildContextualHint(
  messageText: string,
  sentiment: Sentiment,
  forPartnerMessage: boolean
): PrivateHint {
  const quote = extractQuote(messageText);

  if (sentiment === 'meta' || detectMetaComment(messageText)) {
    return {
      tone: `Powtarzasz to samo. Albo dodaj nowy fakt, albo przyznaj się do jednej rzeczy, której unikasz.`,
    };
  }

  if (detectAccusation(messageText) || /ty zawsze|ty nigdy|ty decydujesz/i.test(messageText)) {
    return {
      tone: `«${quote}» brzmi jak atak — partner tego nie przyjmie. Powiedz, co TY zrobiłeś/aś źle w tej sytuacji.`,
      suggestion: 'Zamiast „ty zawsze" — jedno zdanie: „Ja wtedy…".',
    };
  }

  if (isEvasiveReply(messageText)) {
    return {
      tone: `«${quote}» to za mało. Bez konkretu partner nie wie, o czym rozmawiacie.`,
      suggestion: 'Podaj: kiedy, co powiedziałeś/aś, co zrobiłeś/aś — bez ogólników.',
    };
  }

  if (sentiment === 'constructive') {
    return {
      tone: `«${quote}» brzmi ładnie, ale za miękko. Jaka jest najtrudniejsza prawda, której tu nie mówisz?`,
      suggestion: 'Dopisz jedną rzecz, za którą bierzesz odpowiedzialność.',
    };
  }

  if (sentiment === 'vague' || isShortOrVague(messageText)) {
    return {
      tone: `«${quote}» to unikanie. Co dokładnie zrobiłeś/aś lub powiedziałeś/aś?`,
      suggestion: 'Bez „czułem/am się źle" — konkret: słowa, gest, moment.',
    };
  }

  if (forPartnerMessage) {
    return {
      tone: `Partner napisał: «${quote}». Zanim odpowiesz — co w tym jest prawdziwe, nawet jeśli boli?`,
      suggestion: 'Najpierw nazwij jedną rzecz, którą rozumiesz po jego/jej stronie.',
    };
  }

  switch (sentiment) {
    case 'aggressive':
      return {
        tone: `W «${quote}» słychać atak. Partner usłyszy tylko oskarżenie — co TY zrobiłeś/aś, że doszło do tego momentu?`,
        suggestion: 'Jedno zdanie o własnej roli, bez „ale on/ona".',
      };
    case 'defensive':
      return {
        tone: `«${quote}» brzmi jak obrona. Co jest w tym faktycznie twoją winą — choćby 5%?`,
        suggestion: 'Przyznanie się do małej części rozbraja kłótnię.',
      };
    case 'upset':
      return {
        tone: `«${quote}» — emocja jest, ale brakuje faktu. Co dokładnie partner zrobił/a, co cię uraziło?`,
        suggestion: 'Bez dramatyzowania: kiedy, co, jakie słowa.',
      };
    default:
      return {
        tone: `«${quote}» — co w tej odpowiedzi jest prawdą, a co wymówką?`,
        suggestion: 'Doprecyzuj jeden moment, którego wstydzisz się przyznać.',
      };
  }
}

function getParticipantMessages(
  messages: LiveMessage[],
  participantIds: string[]
): LiveMessage[] {
  return messages.filter(
    (m) => m.message_type === 'message' && participantIds.includes(m.sender_id)
  );
}

function participantCompletedPhase(
  messages: LiveMessage[],
  participantIds: string[],
  phase: number
): boolean {
  const texts = getParticipantMessages(messages, participantIds).map((m) => m.content);
  if (texts.length === 0) return false;

  switch (phase) {
    case 1:
      return texts.some((t) => matchesAny(t, EMOTION_PATTERNS));
    case 2:
      return texts.some((t) => matchesAny(t, NEED_PATTERNS));
    case 3:
      return texts.some((t) => matchesAny(t, UNDERSTANDING_PATTERNS));
    case 4:
      return texts.some((t) => matchesAny(t, SOLUTION_PATTERNS));
    default:
      return false;
  }
}

function detectNextPhase(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[],
  currentPhase: number
): { phase: number; transition?: string } {
  const participants = [hostUserId, ...partnerUserIds];
  const hostDone = participantCompletedPhase(messages, [hostUserId], currentPhase);
  const partnerDone =
    partnerUserIds.length === 0
      ? hostDone
      : participantCompletedPhase(messages, partnerUserIds, currentPhase);

  if (hostDone && partnerDone && currentPhase < 4) {
    const next = currentPhase + 1;
    return { phase: next, transition: getPhaseTransitionMessage(next) };
  }

  return { phase: currentPhase };
}

function pickNextQuestionIndex(
  currentQuestionIndex: number,
  isFromPartner: boolean,
  lang: Language = 'pl'
): number {
  if (isFromPartner) return currentQuestionIndex;
  const flowLen = questionFlow(lang).length;
  return Math.min(currentQuestionIndex + 1, flowLen - 1);
}

function buildPublicReflection(
  trigger: LiveMessage,
  sentiment: Sentiment,
  phase: number,
  metaComment = false
): string {
  if (metaComment || sentiment === 'meta') {
    return 'Rozumiem, że już odpowiedziałeś/aś. Czy chcesz dodać coś jeszcze?';
  }

  const quote = extractQuote(trigger.content, 36);
  if (isEvasiveReply(trigger.content)) {
    return `«${quote}» brzmi bardzo ogólnie — co dokładnie się wydarzyło i co wtedy poczułeś/aś?`;
  }
  if (sentiment === 'constructive') {
    return `Powiedziałeś/aś: «${quote}» — co w tej sytuacji było dla Ciebie najtrudniejsze?`;
  }
  if (sentiment === 'aggressive' || detectAccusation(trigger.content)) {
    return `Słyszę napięcie w «${quote}». Spróbujmy mówić o uczuciach, nie o winie.`;
  }
  if (sentiment === 'vague' || isShortOrVague(trigger.content)) {
    return `«${quote}» — co dokładnie wtedy poczułeś/aś w ciele?`;
  }
  if (phase === 1) {
    return `Słyszę: «${quote}». Co dokładnie wtedy poczułeś/aś?`;
  }
  if (phase === 2) {
    return `Za «${quote}» mogą stać konkretne potrzeby — jakiej potrzeby dotyczy ta sytuacja?`;
  }
  if (phase === 3) {
    return `«${quote}» — co z perspektywy partnera może być tu niewidoczne?`;
  }
  return 'Co konkretnie możecie uzgodnić już teraz?';
}

function buildAnswerPrivateHint(
  answerMessage: LiveMessage,
  allMessages: LiveMessage[],
  forPartnerMessage: boolean
): PrivateHint | undefined {
  const metaDecline =
    !forPartnerMessage && isMetaFollowupDecline(answerMessage.content, allMessages);
  const metaComment =
    !metaDecline && detectMetaComment(answerMessage.content, allMessages);
  const hintSentiment: Sentiment =
    metaComment || metaDecline ? 'meta' : analyzeSentiment(answerMessage.content, allMessages);

  return normalizePrivateHint(
    buildContextualHint(answerMessage.content, hintSentiment, forPartnerMessage),
    answerMessage.content,
    forPartnerMessage
  );
}

/** Po obu odpowiedziach — osobna twarda wskazówka dla każdej strony (routing po user.id wywołującego). */
export function analyzeBothAnswersAck(
  triggerMessage: LiveMessage,
  currentUserId: string,
  partnerUserIds: string[],
  currentPhase: number,
  allMessages: LiveMessage[],
  currentQuestionIndex = 0
): LiveMediatorResponse {
  const lastQuestion = getLastQuestionMessage(allMessages);
  const after = getMessagesAfterQuestion(allMessages, lastQuestion);

  const myAnswer = after.find(
    (m) => m.message_type === 'message' && m.sender_id === currentUserId
  );
  const partnerAnswer = after.find(
    (m) => m.message_type === 'message' && partnerUserIds.includes(m.sender_id)
  );

  const escalated =
    detectEscalation(triggerMessage.content) ||
    (myAnswer ? detectEscalation(myAnswer.content) : false) ||
    (partnerAnswer ? detectEscalation(partnerAnswer.content) : false);

  return {
    publicMessage: undefined,
    aiQuestion: undefined,
    questionTarget: 'oboje',
    privateHint: myAnswer
      ? buildAnswerPrivateHint(myAnswer, allMessages, false)
      : undefined,
    partnerPrivateHint: partnerAnswer
      ? buildAnswerPrivateHint(partnerAnswer, allMessages, true)
      : undefined,
    triggerMessageId: triggerMessage.id,
    escalationDetected: escalated,
    escalationMessage: escalated ? liveStrings('pl').escalation : undefined,
    phase: currentPhase,
    progress: getPhaseProgress(currentPhase),
    nextQuestionIndex: currentQuestionIndex,
  };
}

export function analyzeMediationTurn(
  triggerMessage: LiveMessage,
  hostUserId: string,
  partnerUserIds: string[],
  currentPhase: number,
  allMessages: LiveMessage[],
  currentQuestionIndex = 0
): LiveMediatorResponse {
  return analyzeBothAnswersAck(
    triggerMessage,
    hostUserId,
    partnerUserIds,
    currentPhase,
    allMessages,
    currentQuestionIndex
  );
}

export function mockLiveMediatorResponse(
  triggerMessage: LiveMessage,
  hostUserId: string,
  partnerUserIds: string[],
  currentPhase: number,
  allMessages: LiveMessage[],
  currentQuestionIndex = 0
): LiveMediatorResponse {
  return analyzeMediationTurn(
    triggerMessage,
    hostUserId,
    partnerUserIds,
    currentPhase,
    allMessages,
    currentQuestionIndex
  );
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

const WEAK_HINT_TONE =
  /^(bezpośredni|bezposredni|direct|neutral|konstruktywny|constructive|meta)$/i;

function isWeakPrivateHint(hint?: PrivateHint): boolean {
  if (!hint) return true;
  const parts = [hint.tone, hint.emotion, hint.suggestion].filter(Boolean);
  if (parts.length === 0) return true;
  const combined = parts.join(' ').trim();
  if (combined.length < 28) return true;
  const tone = (hint.tone || '').trim();
  if (tone && WEAK_HINT_TONE.test(tone) && !hint.suggestion && !hint.emotion) return true;
  return false;
}

export function normalizePrivateHint(
  hint: PrivateHint | undefined,
  messageText: string,
  forPartnerMessage: boolean
): PrivateHint | undefined {
  if (!messageText.trim()) return undefined;
  if (!isWeakPrivateHint(hint)) return hint;
  const enriched = buildContextualHint(
    messageText,
    analyzeSentiment(messageText),
    forPartnerMessage
  );
  return isWeakPrivateHint(enriched) ? undefined : enriched;
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
    response.summaryType === 'proposed_solution'
  ) {
    const kindMap: Record<string, string> = {
      opening: 'opening_summary',
      mid: 'mid_summary',
      final: 'final_summary',
      extension_check: 'extension_check',
      proposed_solution: 'proposed_solution',
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

  if (response.state) {
    inserts.push({
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: '',
      message_type: 'system',
      is_private: false,
      phase: response.phase ?? phase,
      metadata: { action: CONVERSATION_STATE_ACTION, state: response.state },
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
        const isStateRow = typedRow.metadata?.action === CONVERSATION_STATE_ACTION;

        if (!isStateRow && !isValidOutgoingChatContent(content)) {
          return false;
        }

        if (!isStateRow && sentContent.has(content)) {
          skippedByRef++;
          console.log(
            `[insertAiMessages] duplicate prevented by ref: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`
          );
          return false;
        }

        if (!isStateRow && isRecentAiDuplicate({ content }, recentAi)) {
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

export function applyAiResponseLocally(
  currentSession: LiveSession | null,
  response: LiveMediatorResponse,
  phase: number,
  mediationId?: string,
  userId?: string
): LiveSession {
  const base =
    currentSession ||
    (mediationId && userId
      ? createMockLiveSession(mediationId, userId)
      : createMockLiveSession('local', 'local'));

  return {
    ...base,
    live_phase: response.phase ?? phase,
    live_progress: response.progress ?? getPhaseProgress(response.phase ?? phase),
    current_question: response.aiQuestion ?? base.current_question,
    current_question_index: response.nextQuestionIndex ?? base.current_question_index ?? 0,
  };
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
    response.summaryType === 'proposed_solution'
  ) {
    const kindMap: Record<string, string> = {
      opening: 'opening_summary',
      mid: 'mid_summary',
      final: 'final_summary',
      extension_check: 'extension_check',
      proposed_solution: 'proposed_solution',
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
      const questionId =
        typeof response.state?.currentQuestion?.id === 'string'
          ? response.state.currentQuestion.id
          : undefined;
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
          questionId,
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

  if (response.state) {
    pushMessage({
      id: nextId('state'),
      sender_id: 'ai',
      sender_name: 'Mediator AI',
      content: '',
      message_type: 'system',
      is_private: false,
      recipient_id: null,
      phase: phaseValue,
      metadata: { action: CONVERSATION_STATE_ACTION, state: response.state },
      created_at: nextCreatedAt(6),
    });
  }

  return filterValidLiveAiMessages(messages);
}

export function formatHintPreview(hint?: PrivateHint, lang: Language = 'pl'): string {
  const s = liveStrings(lang);
  if (!hint) return s.hintDefault;
  const line = hint.tone || hint.suggestion || hint.emotion;
  return line ? fmt(s.hintPrefix, { line }) : s.hintAnalyzing;
}

function localLiveMediatorFallback(
  triggerMessage: LiveMessage,
  currentPhase: number,
  currentQuestionIndex: number,
  mediationContext?: MediationContext | null,
  lang: Language = 'pl'
): LiveMediatorResponse {
  const s = liveStrings(lang);
  const flow = questionFlow(lang);
  const analysis = mediationContext?.analysis ?? null;
  const triggerContent = triggerMessage.content || '';
  const quote = extractQuote(triggerContent, 48);
  const contextLine = primaryAnalysisContext(analysis);
  const keyTrigger = stringFromAnalysisField(analysis, 'key_trigger');
  const phase = Math.min(4, Math.max(1, currentPhase || 1));
  const escalated = detectEscalation(triggerContent);
  const contextShort = contextLine ? extractQuote(contextLine, 90) : '';
  const fb = s.fallback;

  let publicMessage: string;
  if (isEvasiveReply(triggerContent)) {
    const hint = contextShort ? ` ${contextShort}` : '';
    publicMessage = fmt(fb.evasive, { quote, hint });
  } else if (contextShort) {
    publicMessage = fmt(fb.withContext, { quote, context: contextShort });
  } else {
    publicMessage = fmt(fb.generic, { quote });
  }

  const contextTail = keyTrigger
    ? ` ${extractQuote(keyTrigger, 70)}`
    : contextShort
      ? ` ${extractQuote(contextShort, 60)}`
      : '';
  const aiQuestion = formatQuestionWithTarget(
    `${flow[phase - 1] || flow[0]}${contextTail}`,
    'ty',
    lang
  );

  const emotionTags = tagsFromAnalysisField(analysis, 'user_emotions');
  const needTags = tagsFromAnalysisField(analysis, 'user_needs');

  return normalizeEdgeResponse(
    {
      publicMessage,
      aiQuestion,
      questionTarget: 'ty',
      privateHint: escalated
        ? {
            tone: fmt(fb.escalationTone, { quote }),
            emotion: fb.escalationEmotion,
          }
        : {
            tone: fmt(fb.hintTone, { quote }),
            suggestion: emotionTags.length
              ? fmt(fb.hintEmotions, { tags: emotionTags.join(', ') })
              : needTags.length
                ? fmt(fb.hintNeeds, { tags: needTags.join(', ') })
                : contextShort
                  ? fmt(fb.hintContext, { context: extractQuote(contextShort, 50) })
                  : fb.hintFact,
          },
      escalationDetected: escalated,
      escalationMessage: escalated ? s.escalation : undefined,
      phase,
      progress: getPhaseProgress(phase),
      nextQuestionIndex: currentQuestionIndex,
      triggerMessageId: triggerMessage.id,
    },
    triggerMessage,
    currentPhase,
    currentQuestionIndex
  );
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

export function isAwaitingProposalDecision(
  messages: LiveMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): boolean {
  return (
    computeLiveSessionFlow(messages, hostUserId, partnerUserIds).stage ===
    'awaiting_proposal_decision'
  );
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
      live_summary: {
        proposalOutcome,
        closureText: content,
        closedAt: new Date().toISOString(),
      },
    })
    .eq('id', mediationId);

  return saved;
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

export async function processGenerateNextTurn(
  mediationId: string,
  hostUserId: string,
  partnerUserIds: string[],
  allMessages: LiveMessage[],
  language: Language = 'pl',
  mediationContext?: MediationContext | null,
  participantNames?: ParticipantNames
): Promise<LiveMediatorResponse> {
  const turn = computeLiveTurnState(allMessages, hostUserId, partnerUserIds);

  const mode = resolveGenerateMode(turn, allMessages, hostUserId, partnerUserIds);
  if (!mode) {
    return { phase: turn.questionNumber, progress: getPhaseProgress(turn.questionNumber) };
  }

  if (mode === 'opening_summary' || (mode === 'generate_question' && turn.questionNumber === 0)) {
    const syntheticTrigger: LiveMessage = {
      id: `generate-bootstrap-${Date.now()}`,
      mediation_id: mediationId,
      sender_id: 'ai',
      sender_name: 'ai',
      content: '',
      message_type: 'message',
      is_private: false,
      recipient_id: null,
      phase: turn.questionNumber,
      metadata: { generateNext: true, bootstrap: true },
      created_at: new Date().toISOString(),
    };
    return processMediationTurn(
      syntheticTrigger,
      hostUserId,
      partnerUserIds,
      turn.questionNumber || 1,
      allMessages,
      turn.questionNumber,
      language,
      mediationContext,
      mode,
      participantNames
    );
  }

  if (!canGenerateNextQuestion(turn, partnerUserIds)) {
    return { phase: turn.questionNumber, progress: getPhaseProgress(turn.questionNumber) };
  }

  const lastQ = turn.lastQuestion!;
  if (questionAdvancedAfter(allMessages, lastQ.id)) {
    return { phase: turn.questionNumber, progress: getPhaseProgress(turn.questionNumber) };
  }

  const flow = computeLiveSessionFlow(allMessages, hostUserId, partnerUserIds);
  const nextQuestionNumber =
    mode === 'generate_question' ? turn.questionNumber + 1 : turn.questionNumber;

  const syntheticTrigger: LiveMessage = {
    id: `generate-${Date.now()}`,
    mediation_id: mediationId,
    sender_id: 'ai',
    sender_name: 'ai',
    content: '',
    message_type: 'message',
    is_private: false,
    recipient_id: null,
    phase: nextQuestionNumber,
    metadata: { generateNext: true },
    created_at: new Date().toISOString(),
  };

  return processMediationTurn(
    syntheticTrigger,
    hostUserId,
    partnerUserIds,
    nextQuestionNumber,
    allMessages,
    turn.questionNumber,
    language,
    mediationContext,
    mode,
    participantNames
  );
}

function localOpeningSummaryFallback(
  lang: Language,
  perspectiveA: string,
  perspectiveB: string,
  mainConflict: string,
  biggestGap: string,
  participantNames?: ParticipantNames
): { publicMessage: string; aiQuestion: string } {
  const language = normalizeAppLanguage(lang);
  const nameA = participantNames?.hostName?.trim() || 'Partner A';
  const nameB = participantNames?.partnerName?.trim() || partnerBDefaultLabel(language);
  const named = nameA !== 'Partner A' && nameB !== 'Partner B' && nameB !== 'Partnerka/Partner B';
  return {
    publicMessage: formatOpeningSummary(
      language,
      nameA,
      nameB,
      perspectiveA,
      perspectiveB,
      mainConflict,
      biggestGap
    ),
    aiQuestion: buildOpeningFirstQuestion(
      language,
      nameA,
      nameB,
      perspectiveA,
      perspectiveB,
      named
    ),
  };
}

function localGenerateFallback(
  mode: MediatorMode,
  questionNumber: number,
  askedQuestions: string[],
  lang: Language,
  mediationContext?: MediationContext | null,
  recentAnswers: string[] = [],
  extensionActive = false,
  participantNames?: ParticipantNames
): LiveMediatorResponse {
  const ui = getLiveMediationExtras(lang).live;
  const maxQ = extensionActive
    ? LIVE_QUESTIONS_TARGET + LIVE_EXTENSION_QUESTIONS
    : LIVE_QUESTIONS_TARGET;

  if (mode === 'opening_summary') {
    const hostDesc = mediationContext?.combinedDescription?.trim() || '';
    const partnerDesc = mediationContext?.partnerCombinedDescription?.trim() || '';
    const ctx = primaryAnalysisContext(mediationContext?.analysis ?? null);
    const gap =
      stringFromAnalysisField(mediationContext?.analysis ?? null, 'perspective_gap_detail') ||
      (lang === 'en'
        ? 'Each side interprets motives differently.'
        : 'Każda strona inaczej interpretuje motywy drugiej.');
    const perspectiveA = hostDesc || ctx || '—';
    const perspectiveB = partnerDesc || '—';
    const mainConflict = ctx || '—';
    const gaps: IdentifiedGap[] = [
      { id: 'intent_gap', description: gap, resolved: false, discussionRounds: 0 },
      {
        id: 'trust_gap',
        description: lang === 'en' ? 'Different trust expectations' : 'Różne oczekiwania co do zaufania',
        resolved: false,
        discussionRounds: 0,
      },
    ];
    const opening = localOpeningSummaryFallback(
      lang,
      perspectiveA,
      perspectiveB,
      mainConflict,
      gap,
      participantNames
    );
    return {
      publicMessage: opening.publicMessage,
      aiQuestion: opening.aiQuestion,
      summaryType: 'opening',
      state: {
        ...createDefaultConversationState(),
        phase: 'gap_exploration',
        identifiedGaps: gaps,
        activeGapId: gaps[0].id,
        openingSummaryDone: true,
        mainConflictQuestionAsked: true,
        perspectiveA,
        perspectiveB,
        mainConflict,
        questionCount: 1,
      },
      phase: 1,
      progress: getPhaseProgress(1, undefined, maxQ),
      nextQuestionIndex: 1,
    };
  }

  if (mode === 'mid_summary') {
    const ctx = primaryAnalysisContext(mediationContext?.analysis ?? null);
    return {
      publicMessage: `${ui.midSummaryHeader}\n\n${ctx || 'Wciąż unikacie sedna sporu.'}\n\nKażde z was ma luki do pracy — nazwijcie je uczciwie.\n\nMocna strona: jesteście tu i jeszcze rozmawiacie.`,
      summaryType: 'mid',
      phase: questionNumber,
      progress: getPhaseProgress(questionNumber, undefined, maxQ),
      nextQuestionIndex: questionNumber,
    };
  }

  if (mode === 'final_summary') {
    return {
      publicMessage: `${ui.finalSummaryHeader}\n\n${ui.finalSummaryBody}`,
      summaryType: 'final',
      phase: questionNumber,
      progress: 100,
      nextQuestionIndex: questionNumber,
    };
  }

  if (mode === 'extension_check') {
    return {
      publicMessage: `${ui.extensionCheckHeader}\n\n${ui.extensionCheckBody}`,
      summaryType: 'extension_check',
      phase: questionNumber,
      progress: getPhaseProgress(questionNumber, undefined, maxQ),
      nextQuestionIndex: questionNumber,
    };
  }

  if (mode === 'proposed_solution') {
    const ctx = primaryAnalysisContext(mediationContext?.analysis ?? null);
    return {
      publicMessage: `${ui.proposedSolutionHeader}\n\n${ctx ? `Sedno: ${ctx}\n\n` : ''}${ui.proposedSolutionBody}`,
      summaryType: 'proposed_solution',
      phase: questionNumber,
      progress: 100,
      nextQuestionIndex: questionNumber,
    };
  }

  const qPhase = getQuestionPhase(
    extensionActive ? Math.max(questionNumber + 1, LIVE_QUESTIONS_TARGET + 1) : questionNumber + 1,
    extensionActive
  );

  if (questionNumber === 0) {
    const perspectiveA =
      mediationContext?.combinedDescription?.trim() ||
      primaryAnalysisContext(mediationContext?.analysis ?? null) ||
      '—';
    const perspectiveB = mediationContext?.partnerCombinedDescription?.trim() || '—';
    const mainConflict = primaryAnalysisContext(mediationContext?.analysis ?? null) || '—';
    const rawQ =
      lang === 'en'
        ? `Partner A claims:\n"${perspectiveA}"\n\nPartner B claims:\n"${perspectiveB}"\n\nDon't try to decide who is right yet.\nFirst I want to understand why each of you believes your version is true.\nEach of you describe one concrete event that best shows your perspective.\nDon't describe emotions. Describe facts.`
        : `Partner A twierdzi:\n"${perspectiveA}"\n\nPartner B twierdzi:\n"${perspectiveB}"\n\nNie próbujcie jeszcze ustalać kto ma rację.\nNajpierw chcę zrozumieć, dlaczego każde z was uważa swoją wersję za prawdziwą.\nKażde z was opisz jedno konkretne wydarzenie, które najlepiej pokazuje waszą perspektywę.\nNie opisujcie emocji.\nOpiszcie fakty.`;
    return {
      publicMessage: undefined,
      aiQuestion: formatQuestionWithTarget(rawQ, 'oboje', lang),
      questionTarget: 'oboje',
      phase: 1,
      progress: getPhaseProgress(1, undefined, maxQ),
      nextQuestionIndex: 1,
      state: {
        ...createDefaultConversationState(),
        openingSummaryDone: true,
        mainConflictQuestionAsked: true,
        perspectiveA,
        perspectiveB,
        mainConflict,
        phase: 'gap_exploration',
      },
    };
  }

  const state = createDefaultConversationState();
  const gap = getPrimaryUnresolvedGap({
    ...state,
    identifiedGaps: [
      {
        id: 'intent_gap',
        description:
          stringFromAnalysisField(mediationContext?.analysis ?? null, 'perspective_gap_detail') ||
          (lang === 'en' ? 'Different intentions' : 'Różne intencje'),
        resolved: false,
        discussionRounds: 0,
      },
    ],
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    phase: 'gap_exploration',
  });
  const rawQ = gap
    ? lang === 'en'
      ? `Focus only on this gap: «${gap.description}». What does each of you see differently?`
      : `Skupcie się wyłącznie na luce: «${gap.description}». Co każde z was widzi inaczej?`
    : buildContextualQuestion(
        mediationContext,
        recentAnswers,
        askedQuestions,
        questionNumber + 1,
        lang,
        qPhase
      );
  return {
    publicMessage: undefined,
    aiQuestion: formatQuestionWithTarget(rawQ, 'oboje', lang),
    questionTarget: 'oboje',
    phase: questionNumber + 1,
    progress: getPhaseProgress(questionNumber + 1, undefined, maxQ),
    nextQuestionIndex: questionNumber + 1,
  };
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
  mode: MediatorMode = 'answer_ack',
  participantNames?: ParticipantNames
): Promise<LiveMediatorResponse> {
  const combinedDescription = truncateCombinedDescription(
    mediationContext?.combinedDescription || ''
  );
  const partnerCombinedDescription = truncateCombinedDescription(
    mediationContext?.partnerCombinedDescription || '',
    700
  );
  const analysisSummary = buildAnalysisSummary(
    mediationContext?.analysis ?? null,
    mediationContext?.partnerAnalysis ?? null
  );
  const senderRole = resolveSenderRole(
    triggerMessage.sender_id,
    hostUserId,
    partnerUserIds
  );
  const askedQuestions = getAskedQuestionTexts(allMessages);
  const extensionActive = isExtensionActive(allMessages);
  const flow = computeLiveSessionFlow(allMessages, hostUserId, partnerUserIds);
  const conversationState = getConversationState(allMessages);
  const questionNumber =
    mode === 'generate_question'
      ? currentQuestionIndex
      : countAskedQuestions(allMessages);
  const questionPhase =
    mode === 'generate_question'
      ? getQuestionPhase(
          extensionActive ? Math.max(questionNumber + 1, LIVE_QUESTIONS_TARGET + 1) : questionNumber + 1,
          extensionActive,
          conversationState
        )
      : flow.questionPhase;

  const lastUserMessage = allMessages
    .filter((m) => m.message_type === 'message' && m.content.trim())
    .at(-1);

  const legacyPayload = {
    mediationId: triggerMessage.mediation_id,
    userId: hostUserId,
    message: triggerMessage.content,
    senderId: triggerMessage.sender_id,
    lastMessage: lastUserMessage?.content ?? triggerMessage.content,
    mode,
    phase: currentPhase,
    questionNumber,
    questionIndex: currentQuestionIndex,
    questionPhase,
    extensionActive,
    state: conversationState,
    combinedDescription,
    partnerCombinedDescription,
    analysisSummary,
    priorAgreements: mediationContext?.priorAgreements || undefined,
    triggerMessage: {
      content: triggerMessage.content,
      senderId: triggerMessage.sender_id,
      senderRole,
    },
    recentMessages: allMessages.slice(-40).map((m) => ({
      sender_id: m.sender_id,
      content: m.content,
      message_type: m.message_type,
      metadata: m.metadata
        ? {
            replyToQuestionId:
              typeof m.metadata.replyToQuestionId === 'string'
                ? m.metadata.replyToQuestionId
                : undefined,
            questionId:
              typeof m.metadata.questionId === 'string' ? m.metadata.questionId : undefined,
            summaryKind:
              typeof m.metadata.summaryKind === 'string' ? m.metadata.summaryKind : undefined,
          }
        : undefined,
    })),
    language: normalizeAppLanguage(language),
    hostName: participantNames?.hostName,
    partnerName: participantNames?.partnerName,
    hostDescription: combinedDescription,
    partnerDescription: partnerCombinedDescription,
    partnerUserId: partnerUserIds[0] ?? undefined,
  };

  const persistedRuntime = await loadMediationRuntimeState(triggerMessage.mediation_id);

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
    isBootstrap: triggerMessage.metadata?.bootstrap === true,
    mediationState: persistedRuntime.mediationState,
    sessionMemory: persistedRuntime.sessionMemory,
  });

  const legacyPathActive = !isMediatorRuntimeEnabled();
  const mediatorTurnStartedAt = Date.now();
  let runtimeTurnPersist: MediatorRuntimeParsedSuccess | null = null;

  try {
    const result = await routeLiveMediatorTurn(runtimeTurnInput, {
      isRuntimeEnabled: isMediatorRuntimeEnabled,
      callRuntime: async (input) => {
        const parsed = await callMediatorRuntime(input);
        runtimeTurnPersist = parsed;
        return parsed.response;
      },
      callLegacy: () => callEdge<LiveMediatorResponse>(EDGE.liveMediator, legacyPayload),
      onRuntimeFailure: logMediatorRuntimeRolloutFailure,
    });

    if (runtimeTurnPersist) {
      await persistMediationRuntimeState(triggerMessage.mediation_id, runtimeTurnPersist);
    }

    if (legacyPathActive && shouldRunMediatorShadow()) {
      scheduleMediatorShadowRun(runtimeTurnInput, result ?? {}, {
        language: toRuntimeLanguage(language),
        legacyLatencyMs: Date.now() - mediatorTurnStartedAt,
      });
    }

    if (
      result &&
      (result.publicMessage ||
        result.aiQuestion ||
        result.privateHint ||
        result.partnerPrivateHint ||
        result.summaryType) &&
      !isStaleLiveEdgeResponse(result) &&
      !polishMediatorLeak(language, result)
    ) {
      const normalized = normalizeEdgeResponse(
        result,
        triggerMessage,
        currentPhase,
        currentQuestionIndex
      );
      const textSafe = normalizeMediatorResponseText(normalized);
      if (textSafe.state) {
        textSafe.state = normalizeConversationState(textSafe.state);
      }
      if (textSafe.aiQuestion && mode === 'generate_question') {
        textSafe.questionTarget = 'oboje';
        const bare = extractQuestionBare(textSafe.aiQuestion);
        textSafe.aiQuestion = formatQuestionWithTarget(bare, 'oboje', language);
      }
      if (mode === 'answer_ack') {
        const local = analyzeBothAnswersAck(
          triggerMessage,
          hostUserId,
          partnerUserIds,
          currentPhase,
          allMessages,
          currentQuestionIndex
        );
        const lastQuestion = getLastQuestionMessage(allMessages);
        const after = getMessagesAfterQuestion(allMessages, lastQuestion);
        const myAnswer = after.find(
          (m) => m.message_type === 'message' && m.sender_id === hostUserId
        );
        const partnerAnswer = after.find(
          (m) => m.message_type === 'message' && partnerUserIds.includes(m.sender_id)
        );

        const edgeMyHint =
          textSafe.privateHint && myAnswer
            ? normalizePrivateHint(textSafe.privateHint, myAnswer.content, false)
            : undefined;
        const edgePartnerHint =
          textSafe.partnerPrivateHint && partnerAnswer
            ? normalizePrivateHint(
                textSafe.partnerPrivateHint,
                partnerAnswer.content,
                true
              )
            : textSafe.privateHint && partnerAnswer && !textSafe.partnerPrivateHint
              ? normalizePrivateHint(textSafe.privateHint, partnerAnswer.content, true)
              : undefined;

        return sanitizeAnswerAckResponse({
          ...local,
          privateHint: isWeakPrivateHint(edgeMyHint) ? local.privateHint : edgeMyHint,
          partnerPrivateHint: isWeakPrivateHint(edgePartnerHint)
            ? local.partnerPrivateHint
            : edgePartnerHint,
          escalationDetected:
            textSafe.escalationDetected ?? local.escalationDetected,
          escalationMessage: textSafe.escalationMessage ?? local.escalationMessage,
        });
      }
      if (textSafe.privateHint && triggerMessage.content) {
        textSafe.privateHint = normalizePrivateHint(
          textSafe.privateHint,
          triggerMessage.content,
          senderRole === 'partner'
        );
      }
      return textSafe;
    }
  } catch {
    // Use context-aware local fallback below.
  }

  if (mode === 'answer_ack') {
    return sanitizeAnswerAckResponse(
      analyzeMediationTurn(
        triggerMessage,
        hostUserId,
        partnerUserIds,
        currentPhase,
        allMessages,
        currentQuestionIndex
      )
    );
  }

  const recentAnswers = allMessages
    .filter((m) => m.message_type === 'message' && m.content.trim())
    .map((m) => m.content.trim())
    .slice(-4);

  return localGenerateFallback(
    mode,
    questionNumber,
    askedQuestions,
    language,
    mediationContext,
    recentAnswers,
    extensionActive,
    participantNames
  );
}

interface LoadedMediationRuntimeState {
  mediationState: MediationState | null;
  sessionMemory: SessionMemory | null;
}

function parseStoredJsonObject<T extends object>(value: unknown): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as T;
}

/** Loads v2.3 runtime state persisted on mediations (Phase UI-B.1b). */
async function loadMediationRuntimeState(
  mediationId: string
): Promise<LoadedMediationRuntimeState> {
  try {
    await prepareSupabaseRequest();
    const { data, error } = await supabase
      .from('mediations')
      .select('mediation_state, session_memory')
      .eq('id', mediationId)
      .maybeSingle();

    if (error || !data) {
      return { mediationState: null, sessionMemory: null };
    }

    return {
      mediationState: parseStoredJsonObject<MediationState>(data.mediation_state),
      sessionMemory: parseStoredJsonObject<SessionMemory>(data.session_memory),
    };
  } catch {
    return { mediationState: null, sessionMemory: null };
  }
}

function buildMediationRuntimePersistencePatch(runtime: MediatorRuntimeEdgeSuccess) {
  return {
    mediation_state: runtime.mediationState,
    session_memory: runtime.sessionMemory,
    mediator_engine_version: runtime.engineVersion ?? MEDIATOR_RUNTIME_ENGINE_VERSION,
    mediator_runtime_metadata: {
      turnNumber: runtime.runtimeMetadata.turnNumber,
      providerId: runtime.runtimeMetadata.providerId,
      fallbackUsed: runtime.fallbackUsed,
      retryCount: runtime.retryCount,
      persistedAt: new Date().toISOString(),
    },
    mediator_last_goal: runtime.mediationState.currentGoal,
    mediator_last_strategy: runtime.mediationState.activeStrategy?.primary ?? null,
    mediator_last_safety_level: resolveMediatorLastSafetyLevel(runtime),
    updated_at: new Date().toISOString(),
  };
}

const SAFETY_LEVEL_VALUES: readonly SafetyLevel[] = [
  'none',
  'L1_gentle',
  'L2_pause',
  'L3_stop',
];

function isSafetyLevel(value: unknown): value is SafetyLevel {
  return typeof value === 'string' && SAFETY_LEVEL_VALUES.includes(value as SafetyLevel);
}

/** MediatorRuntimeEdgeSuccess: safety on finalMediatorMessage; ComplianceResult has no safety field in v2.3. */
function resolveMediatorLastSafetyLevel(runtime: MediatorRuntimeEdgeSuccess): SafetyLevel | null {
  const messageSafety = runtime.finalMediatorMessage?.safetyLevel;
  if (isSafetyLevel(messageSafety)) {
    return messageSafety;
  }

  const compliance = runtime.complianceResult;
  if (compliance && typeof compliance === 'object' && 'safetyLevel' in compliance) {
    const complianceSafety = (compliance as { safetyLevel?: unknown }).safetyLevel;
    if (isSafetyLevel(complianceSafety)) {
      return complianceSafety;
    }
  }

  return null;
}

/** Persists v2.3 runtime state after a successful mediator-runtime turn (Phase UI-B.1b). */
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

export function getSimulatedPartnerReply(userMessage: string, phase: number): string {
  const lower = userMessage.toLowerCase();
  if (phase === 1) {
    if (lower.includes('czuję') || lower.includes('czuje')) {
      return 'Rozumiem. Ja też czułem/am się zraniony/a i chciałbym/chciałabym to omówić spokojnie.';
    }
    return 'To było dla mnie trudne. Czułem/am frustrację i smutek jednocześnie.';
  }
  if (phase === 2) {
    return 'Potrzebuję poczucia, że moja perspektywa też ma znaczenie.';
  }
  if (phase === 3) {
    return 'Słyszę, co mówisz. Chcę też, żebyś zrozumiał/a moje intencje.';
  }
  return 'Możemy ustalić mały krok na start — jestem otwarty/a na kompromis.';
}

export function createSimulatedPartnerMessage(
  mediationId: string,
  content: string,
  phase: number,
  partnerName = 'Partner (symulacja)'
): LiveMessage {
  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    mediation_id: mediationId,
    sender_id: SIMULATED_PARTNER_ID,
    sender_name: partnerName,
    content,
    message_type: 'message',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: { simulated: true },
    created_at: new Date().toISOString(),
  };
}

export async function sendSimulatedPartnerMessage(
  mediationId: string,
  content: string,
  phase: number,
  partnerName = 'Partner (symulacja)'
): Promise<LiveMessage> {
  return createSimulatedPartnerMessage(mediationId, content, phase, partnerName);
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

/** @deprecated Use processMediationTurn */
export async function callLiveMediator(
  mediationId: string,
  userId: string,
  message: string,
  phase: number,
  recentMessages: LiveMessage[],
  language: Language = 'pl'
): Promise<LiveMediatorResponse> {
  const trigger: LiveMessage = {
    id: 'trigger',
    mediation_id: mediationId,
    sender_id: userId,
    sender_name: 'Ty',
    content: message,
    message_type: 'message',
    is_private: false,
    recipient_id: null,
    phase,
    metadata: null,
    created_at: new Date().toISOString(),
  };

  const partnerIds = recentMessages
    .filter((m) => m.sender_id !== userId && m.sender_id !== 'ai' && m.message_type === 'message')
    .map((m) => m.sender_id)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  return processMediationTurn(
    trigger,
    userId,
    partnerIds,
    phase,
    recentMessages,
    0,
    language
  );
}
