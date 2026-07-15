/**
 * Live Mediator v3.10 — stable host-led mediation flow
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  answerAckTexts,
  bankExhaustedFallback,
  buildBrainSystemPrompt as i18nBuildBrainSystemPrompt,
  buildConflictQuestion as i18nBuildConflictQuestion,
  buildContradictionQuestion as i18nBuildContradictionQuestion,
  buildGenericRepairBothQuestion as i18nBuildGenericRepairBothQuestion,
  buildOpeningFirstQuestion as i18nBuildOpeningFirstQuestion,
  buildReconciliationPrivateHints as i18nBuildReconciliationPrivateHints,
  buildReconciliationRepairQuestion as i18nBuildReconciliationRepairQuestion,
  buildReconciliationTransitionMessage as i18nBuildReconciliationTransitionMessage,
  buildRepairClosureHints as i18nBuildRepairClosureHints,
  contradictionSpeakerLabel,
  defaultCommitmentA,
  defaultCommitmentB,
  defaultFallbackPlan,
  defaultSharedRule,
  escalationDetectedMessage,
  escalationRisingMessage,
  evasionDeadlockPrompt as i18nEvasionDeadlockPrompt,
  EVASIVE_ANSWER_PATTERNS,
  fallbackDeepenQuestion as i18nFallbackDeepenQuestion,
  fallbackGapQuestion as i18nFallbackGapQuestion,
  finalSummaryTexts,
  formatOpeningSummary as i18nFormatOpeningSummary,
  formatProposedSolutionMessage as i18nFormatProposedSolutionMessage,
  gapAcknowledgmentQuestion,
  gapFactsQuestion,
  gapInterpretationQuestion,
  gapUnresolvedQuestion,
  getReconciliationPatterns,
  getReconciliationStrongPatterns,
  getRepairBank,
  getResponsibilityBank,
  humanizeGapAbstract,
  humanizeGapDefault,
  normalizeLanguage,
  obojePrefix,
  openAiLanguageDirective,
  openAiLanguageLabel,
  openingFallbackTexts,
  openingSummaryOpenAiRules,
  partnerBDefaultLabel,
  repairCheckQuestion,
  repairStressTestQuestion,
  singleSidedPartnerPrompt as i18nSingleSidedPartnerPrompt,
  summaryFallbackTexts,
  summarySectionPrompts,
  unresolvedGapsLabel,
} from './i18n.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRANSCRIPT_LIMIT = 60;
const GAP_RESOLVE_CONFIDENCE_MIN = 75;
const NO_API_GAP_ROUNDS_FALLBACK = 4;
const _EXTENSION_QUESTIONS = 5;
const QUESTIONS_BUDGET_MIN = 10;
const QUESTIONS_BUDGET_MAX = 25;
const MIN_RESPONSIBILITY_QUESTIONS = 4;
const MIN_REPAIR_QUESTIONS = 3;
const MIN_GAP_EXPLORATION_STEPS = 4;
const REPAIR_STEPS_COUNT = 3;
const MAX_NEW_GAPS_PER_MERGE = 2;
const SINGLE_SIDED_ROUNDS_MAX = 2;
const EVASION_STREAK_DEADLOCK = 3;
const DEFAULT_GAP_PRIORITY = 50;

type Phase = 'summary' | 'gap_exploration' | 'responsibility' | 'repair';
type PartnerSpeaker = 'partnerA' | 'partnerB' | 'unknown';

interface FactMemoryEntry {
  id: string;
  speaker: PartnerSpeaker;
  fact: string;
  relatedGapId?: string;
  confidence: number;
  sourceQuestionIndex?: number;
}

interface StanceEntry {
  speaker: PartnerSpeaker;
  claim: string;
  relatedGapId?: string;
  questionIndex?: number;
  timestamp?: string;
}

interface Contradiction {
  speaker: PartnerSpeaker;
  previousClaim: string;
  newClaim: string;
  relatedGapId?: string;
  severity: number;
}

type MediatorMode =
  | 'opening_summary'
  | 'generate_question'
  | 'answer_ack'
  | 'mid_summary'
  | 'final_summary'
  | 'extension_check'
  | 'proposed_solution';

type QuestionKind = 'conflict' | 'gap' | 'deepen' | 'responsibility' | 'repair';

interface CurrentQuestion {
  id: string;
  phase: string;
  topic: string;
  askedAtQuestionNumber: number;
  answered: boolean;
}

const GAP_STEP_TOPICS = [
  'gap_facts',
  'gap_interpretation',
  'gap_acknowledgment',
  'gap_unresolved',
] as const;

const REPAIR_STEP_TOPICS = [
  'repair_rule',
  'repair_check',
  'repair_stress_test',
] as const;

interface IdentifiedGap {
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

interface ConversationState {
  phase: Phase;
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
  singleSidedRounds: number;
  evasionStreak: number;
  showEvasionDeadlockMessage?: boolean;
  factMemory: FactMemoryEntry[];
  stanceHistory: StanceEntry[];
  contradictions: Contradiction[];
  reconciliationDetected?: boolean;
  reconciliationScore?: number;
  reconciliationReason?: string;
  emotionalResolutionDetected?: boolean;
  reconciliationRepairOffered?: boolean;
  gapExplorationStep?: number;
  repairStep?: number;
  currentQuestion?: CurrentQuestion;
  finalCommitments?: FinalCommitments;
}

interface FinalCommitments {
  partnerA?: string;
  partnerB?: string;
  sharedRule?: string;
  fallbackPlan?: string;
}

interface MediatorBrainResult {
  partnerAAnswered: boolean;
  partnerBAnswered: boolean;
  evasionDetected: boolean;
  evasionReason: string;
  activeGapResolved: boolean;
  gapResolveConfidence: number;
  gapResolveReason: string;
  newGapDetected: boolean;
  newGap: { id: string; description: string } | null;
  readyForResponsibility: boolean;
  responsibilityComplete: boolean;
  repairComplete: boolean;
  readyForMidSummary: boolean;
  conversationFinished: boolean;
  question: string;
}

interface LiveMediatorResponse {
  publicMessage?: string;
  aiQuestion?: string;
  privateHint?: { tone?: string; emotion?: string; suggestion?: string };
  partnerPrivateHint?: { tone?: string; emotion?: string; suggestion?: string };
  escalationDetected?: boolean;
  escalationMessage?: string;
  phase?: number;
  progress?: number;
  nextQuestionIndex?: number;
  summaryType?: 'opening' | 'mid' | 'final' | 'extension_check' | 'proposed_solution';
  state?: ConversationState;
  source?: string;
}

type RecentMessage = {
  sender_id?: string;
  content?: string;
  message_type?: string;
  metadata?: { replyToQuestionId?: string; questionId?: string; summaryKind?: string };
};

const PHASE_ORDER: Phase[] = ['summary', 'gap_exploration', 'responsibility', 'repair'];

function _defaultState(): ConversationState {
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
    sessionQuestionBudget: QUESTIONS_BUDGET_MIN,
    midSummaryShown: false,
    responsibilityReady: false,
    responsibilityComplete: false,
    repairComplete: false,
    midSummaryEligible: false,
    conversationFinished: false,
    singleSidedRounds: 0,
    evasionStreak: 0,
    factMemory: [],
    stanceHistory: [],
    contradictions: [],
  };
}

function normalizeFactMemory(raw: unknown): FactMemoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f === 'object')
    .map((f) => {
      const item = f as Partial<FactMemoryEntry>;
      const speaker =
        item.speaker === 'partnerA' || item.speaker === 'partnerB' || item.speaker === 'unknown'
          ? item.speaker
          : 'unknown';
      return {
        id: typeof item.id === 'string' ? item.id : `fact_${Math.random().toString(36).slice(2, 8)}`,
        speaker,
        fact: typeof item.fact === 'string' ? item.fact : '',
        relatedGapId: typeof item.relatedGapId === 'string' ? item.relatedGapId : undefined,
        confidence:
          typeof item.confidence === 'number'
            ? Math.min(100, Math.max(0, item.confidence))
            : 70,
        sourceQuestionIndex:
          typeof item.sourceQuestionIndex === 'number' ? item.sourceQuestionIndex : undefined,
      };
    })
    .filter((f) => f.fact.trim())
    .slice(-40);
}

function normalizeStanceHistory(raw: unknown): StanceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const item = s as Partial<StanceEntry>;
      const speaker =
        item.speaker === 'partnerA' || item.speaker === 'partnerB' || item.speaker === 'unknown'
          ? item.speaker
          : 'unknown';
      return {
        speaker,
        claim: typeof item.claim === 'string' ? item.claim : '',
        relatedGapId: typeof item.relatedGapId === 'string' ? item.relatedGapId : undefined,
        questionIndex: typeof item.questionIndex === 'number' ? item.questionIndex : undefined,
        timestamp: typeof item.timestamp === 'string' ? item.timestamp : undefined,
      };
    })
    .filter((s) => s.claim.trim())
    .slice(-30);
}

function normalizeContradictions(raw: unknown): Contradiction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const item = c as Partial<Contradiction>;
      const speaker =
        item.speaker === 'partnerA' || item.speaker === 'partnerB' || item.speaker === 'unknown'
          ? item.speaker
          : 'unknown';
      return {
        speaker,
        previousClaim: typeof item.previousClaim === 'string' ? item.previousClaim : '',
        newClaim: typeof item.newClaim === 'string' ? item.newClaim : '',
        relatedGapId: typeof item.relatedGapId === 'string' ? item.relatedGapId : undefined,
        severity:
          typeof item.severity === 'number' ? Math.min(100, Math.max(0, item.severity)) : 50,
      };
    })
    .filter((c) => c.previousClaim && c.newClaim)
    .slice(-20);
}

function normalizeGaps(raw: unknown): IdentifiedGap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g === 'object')
    .map((g) => {
      const item = g as Partial<IdentifiedGap>;
      return {
        id: typeof item.id === 'string' ? item.id : 'gap_unknown',
        description: typeof item.description === 'string' ? item.description : '',
        resolved: Boolean(item.resolved),
        discussionRounds:
          typeof item.discussionRounds === 'number' && item.discussionRounds >= 0
            ? item.discussionRounds
            : 0,
        priority:
          typeof item.priority === 'number'
            ? Math.min(100, Math.max(0, item.priority))
            : DEFAULT_GAP_PRIORITY,
        resolutionReason:
          typeof item.resolutionReason === 'string' ? item.resolutionReason : undefined,
        confidence:
          typeof item.confidence === 'number'
            ? Math.min(100, Math.max(0, item.confidence))
            : undefined,
        deadlocked: Boolean(item.deadlocked),
        resolvedByMutualUnderstanding: Boolean(item.resolvedByMutualUnderstanding),
      };
    })
    .filter((g) => g.id && g.description)
    .slice(0, 12);
}

function normalizeState(raw: unknown): ConversationState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<ConversationState>;
  const phase = PHASE_ORDER.includes(s.phase as Phase) ? (s.phase as Phase) : 'summary';
  return {
    phase,
    identifiedGaps: normalizeGaps(s.identifiedGaps),
    activeGapId: typeof s.activeGapId === 'string' ? s.activeGapId : null,
    openingSummaryDone: Boolean(s.openingSummaryDone),
    mainConflictQuestionAsked:
      Boolean(s.mainConflictQuestionAsked) ||
      (typeof s.questionCount === 'number' && s.questionCount > 0),
    perspectiveA: typeof s.perspectiveA === 'string' ? s.perspectiveA : '',
    perspectiveB: typeof s.perspectiveB === 'string' ? s.perspectiveB : '',
    mainConflict: typeof s.mainConflict === 'string' ? s.mainConflict : '',
    coveredTopics: Array.isArray(s.coveredTopics)
      ? s.coveredTopics.filter((t) => typeof t === 'string').slice(-20)
      : [],
    lastQuestionSignature: typeof s.lastQuestionSignature === 'string' ? s.lastQuestionSignature : '',
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
      typeof s.sessionQuestionBudget === 'number' && s.sessionQuestionBudget >= QUESTIONS_BUDGET_MIN
        ? Math.min(QUESTIONS_BUDGET_MAX, s.sessionQuestionBudget)
        : QUESTIONS_BUDGET_MIN,
    midSummaryShown: Boolean(s.midSummaryShown),
    responsibilityReady: Boolean(s.responsibilityReady),
    responsibilityComplete: Boolean(s.responsibilityComplete),
    repairComplete: Boolean(s.repairComplete),
    midSummaryEligible: Boolean(s.midSummaryEligible),
    conversationFinished: Boolean(s.conversationFinished),
    singleSidedRounds:
      typeof s.singleSidedRounds === 'number' && s.singleSidedRounds >= 0
        ? s.singleSidedRounds
        : 0,
    evasionStreak:
      typeof s.evasionStreak === 'number' && s.evasionStreak >= 0 ? s.evasionStreak : 0,
    showEvasionDeadlockMessage: Boolean(s.showEvasionDeadlockMessage),
    factMemory: normalizeFactMemory(s.factMemory),
    stanceHistory: normalizeStanceHistory(s.stanceHistory),
    contradictions: normalizeContradictions(s.contradictions),
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
    currentQuestion: normalizeCurrentQuestion(s.currentQuestion),
    finalCommitments: normalizeFinalCommitments(s.finalCommitments),
  };
}

function normalizeFinalCommitments(raw: unknown): FinalCommitments | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Partial<FinalCommitments>;
  const out: FinalCommitments = {};
  if (typeof c.partnerA === 'string' && c.partnerA.trim()) out.partnerA = c.partnerA.trim();
  if (typeof c.partnerB === 'string' && c.partnerB.trim()) out.partnerB = c.partnerB.trim();
  if (typeof c.sharedRule === 'string' && c.sharedRule.trim()) out.sharedRule = c.sharedRule.trim();
  if (typeof c.fallbackPlan === 'string' && c.fallbackPlan.trim()) {
    out.fallbackPlan = c.fallbackPlan.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeCurrentQuestion(raw: unknown): CurrentQuestion | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const q = raw as Partial<CurrentQuestion>;
  if (typeof q.id !== 'string' || typeof q.topic !== 'string') return undefined;
  return {
    id: q.id,
    phase: typeof q.phase === 'string' ? q.phase : 'gap',
    topic: q.topic,
    askedAtQuestionNumber:
      typeof q.askedAtQuestionNumber === 'number' ? q.askedAtQuestionNumber : 0,
    answered: Boolean(q.answered),
  };
}

function withFullState(
  partial: Omit<LiveMediatorResponse, 'state'> & { state?: Partial<ConversationState> | ConversationState }
): LiveMediatorResponse {
  return { ...partial, state: normalizeState(partial.state ?? _defaultState()) };
}

function unresolvedGaps(state: ConversationState): IdentifiedGap[] {
  return state.identifiedGaps.filter((g) => !g.resolved);
}

function selectNextGap(state: ConversationState): IdentifiedGap | null {
  const open = unresolvedGaps(state);
  if (open.length === 0) return null;
  return [...open].sort((a, b) => {
    const pDiff = (b.priority ?? DEFAULT_GAP_PRIORITY) - (a.priority ?? DEFAULT_GAP_PRIORITY);
    if (pDiff !== 0) return pDiff;
    return a.discussionRounds - b.discussionRounds;
  })[0];
}

function finalizeConversationIfReady(state: ConversationState): ConversationState {
  const next = { ...state };
  if (unresolvedGaps(next).length === 0 && next.mainConflictQuestionAsked) {
    next.responsibilityReady = canEnterResponsibility(next);
  }
  if (
    (next.repairStep ?? 0) >= REPAIR_STEPS_COUNT ||
    (next.repairQuestionsAsked >= MIN_REPAIR_QUESTIONS && next.repairComplete)
  ) {
    next.repairComplete = true;
    next.conversationFinished = true;
  }
  next.phase = resolveConversationPhase(next);
  return next;
}

function isUsableMediatorQuestion(q: string): boolean {
  const text = q.trim();
  if (text.length < 4) return false;
  if (/^(ok|dalej|rozwiń|continue|next)$/i.test(text)) return false;
  return text.includes('?') || text.length > 20;
}

function singleSidedPartnerPrompt(language: string): string {
  return i18nSingleSidedPartnerPrompt(language);
}

function claimTokenOverlap(a: string, b: string): number {
  const ta = new Set(
    a
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const tb = new Set(
    b
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap++;
  }
  return overlap / Math.min(ta.size, tb.size);
}

function buildContradictionQuestion(
  speaker: PartnerSpeaker,
  previousClaim: string,
  newClaim: string,
  language: string
): string {
  const who = contradictionSpeakerLabel(speaker, language);
  return i18nBuildContradictionQuestion(who, previousClaim, newClaim, language);
}

function recordFactsFromAnswers(
  state: ConversationState,
  partnerAAnswer: string,
  partnerBAnswer: string,
  questionIndex: number,
  gapId: string | null
): ConversationState {
  const newFacts: FactMemoryEntry[] = [];
  if (partnerAAnswer.trim().length > 8) {
    newFacts.push({
      id: `fact_a_${questionIndex}_${newFacts.length}`,
      speaker: 'partnerA',
      fact: partnerAAnswer.trim().slice(0, 220),
      relatedGapId: gapId ?? undefined,
      confidence: 80,
      sourceQuestionIndex: questionIndex,
    });
  }
  if (partnerBAnswer.trim().length > 8) {
    newFacts.push({
      id: `fact_b_${questionIndex}_${newFacts.length}`,
      speaker: 'partnerB',
      fact: partnerBAnswer.trim().slice(0, 220),
      relatedGapId: gapId ?? undefined,
      confidence: 80,
      sourceQuestionIndex: questionIndex,
    });
  }
  if (newFacts.length === 0) return state;
  return { ...state, factMemory: [...state.factMemory, ...newFacts].slice(-40) };
}

function detectStanceChanges(
  state: ConversationState,
  speaker: PartnerSpeaker,
  claim: string,
  gapId: string | null,
  questionIndex: number,
  language: string = 'pl'
): { state: ConversationState; contradictionQuestion?: string } {
  const trimmed = claim.trim();
  if (trimmed.length < 8) {
    return { state };
  }
  const prior = [...state.stanceHistory].reverse().find((s) => s.speaker === speaker);
  const entry: StanceEntry = {
    speaker,
    claim: trimmed.slice(0, 220),
    relatedGapId: gapId ?? undefined,
    questionIndex,
    timestamp: new Date().toISOString(),
  };
  let contradictions = state.contradictions;
  let contradictionQuestion: string | undefined;
  const negationFlip =
    prior &&
    /\b(nie\s+pamiętam|nie\s+wiem|nie\s+było)\b/i.test(prior.claim) &&
    /\b(pamiętam|wiem|było)\b/i.test(trimmed) &&
    !/\bnie\s+(pamiętam|wiem|było)\b/i.test(trimmed);
  if (
    prior &&
    (claimTokenOverlap(prior.claim, trimmed) < 0.25 || negationFlip)
  ) {
    const contradiction: Contradiction = {
      speaker,
      previousClaim: prior.claim,
      newClaim: trimmed.slice(0, 220),
      relatedGapId: gapId ?? undefined,
      severity: 70,
    };
    contradictions = [...contradictions, contradiction].slice(-20);
    contradictionQuestion = buildContradictionQuestion(
      speaker,
      prior.claim,
      trimmed,
      language
    );
  }
  return {
    state: {
      ...state,
      stanceHistory: [...state.stanceHistory, entry].slice(-30),
      contradictions,
    },
    contradictionQuestion,
  };
}

function validateAiGapProposal(g: Partial<IdentifiedGap>): IdentifiedGap | null {
  if (!g.id?.trim() || !g.description?.trim()) return null;
  return {
    id: g.id.trim(),
    description: g.description.trim(),
    resolved: false,
    discussionRounds: 0,
    priority:
      typeof g.priority === 'number'
        ? Math.min(100, Math.max(0, g.priority))
        : DEFAULT_GAP_PRIORITY,
  };
}

function validateAndMergeAiExtras(
  state: ConversationState,
  raw: Record<string, unknown>,
  brain: MediatorBrainResult
): ConversationState {
  let next = { ...state };

  const newFactsRaw = raw.newFacts;
  if (Array.isArray(newFactsRaw)) {
    const validated = normalizeFactMemory(newFactsRaw);
    if (validated.length > 0) {
      next = { ...next, factMemory: [...next.factMemory, ...validated].slice(-40) };
    }
  }

  const contradictionsRaw = raw.contradictions;
  if (Array.isArray(contradictionsRaw)) {
    const validated = normalizeContradictions(contradictionsRaw);
    if (validated.length > 0) {
      next = { ...next, contradictions: [...next.contradictions, ...validated].slice(-20) };
    }
  }

  const newGapsRaw = raw.newGaps;
  if (Array.isArray(newGapsRaw) && newGapsRaw.length > 0) {
    const validated: IdentifiedGap[] = [];
    for (const item of newGapsRaw.slice(0, MAX_NEW_GAPS_PER_MERGE)) {
      const g = validateAiGapProposal(item as Partial<IdentifiedGap>);
      if (g) validated.push(g);
    }
    if (validated.length > 0) {
      next = mergeNewGaps(next, validated);
    }
  } else if (brain.newGapDetected && brain.newGap) {
    const g = validateAiGapProposal({
      id: brain.newGap.id,
      description: brain.newGap.description,
      priority: DEFAULT_GAP_PRIORITY,
    });
    if (g) next = mergeNewGaps(next, [g]);
  }

  return next;
}

function formatFinalSummaryFallback(state: ConversationState, ctx: string, language: string): string {
  const texts = finalSummaryTexts(language);
  const resolved = state.identifiedGaps.filter((g) => g.resolved);
  const unresolved = state.identifiedGaps.filter((g) => !g.resolved);
  const formatResolvedGap = (g: IdentifiedGap) => {
    if (g.deadlocked) {
      return `⚠ ${g.description} — ${texts.deadlock}${g.resolutionReason ? ` — ${g.resolutionReason}` : ''}`;
    }
    return `✓ ${g.description}${g.resolutionReason ? ` — ${g.resolutionReason}` : ''}`;
  };
  const resolvedSection =
    resolved.length > 0 ? resolved.map(formatResolvedGap).join('\n') : texts.noneRecorded;
  const unresolvedSection =
    unresolved.length > 0
      ? unresolved
          .map((g) => `✗ ${g.description}${g.resolutionReason ? ` — ${g.resolutionReason}` : ''}`)
          .join('\n')
      : texts.allAddressed;
  return (
    `${texts.title}\n\n1) ${texts.coreLabel}: ${ctx || texts.seeTranscript}\n` +
    `2) ${texts.resolvedLabel}:\n${resolvedSection}\n` +
    `3) ${texts.unresolvedLabel}:\n${unresolvedSection}\n` +
    `4) ${texts.actionsLabel}`
  );
}

function computeSessionQuestionBudget(
  gapCount: number,
  hostDesc: string,
  partnerDesc: string
): number {
  const textLen = hostDesc.length + partnerDesc.length;
  let budget = QUESTIONS_BUDGET_MIN + gapCount * 2;
  if (textLen > 600) budget += 3;
  if (textLen > 1200) budget += 4;
  if (gapCount >= 4) budget += 3;
  return Math.min(QUESTIONS_BUDGET_MAX, Math.max(QUESTIONS_BUDGET_MIN, budget));
}

function resolveConversationPhase(state: ConversationState): Phase {
  if (!state.openingSummaryDone) return 'summary';
  if (!state.mainConflictQuestionAsked) return 'summary';
  if (!isGapExplorationComplete(state) || unresolvedGaps(state).length > 0) {
    return 'gap_exploration';
  }
  if (
    !state.responsibilityComplete &&
    state.responsibilityQuestionsAsked < MIN_RESPONSIBILITY_QUESTIONS &&
    !(state.reconciliationDetected && state.responsibilityComplete)
  ) {
    return 'responsibility';
  }
  if (state.repairStep !== undefined && state.repairStep < REPAIR_STEPS_COUNT) {
    return 'repair';
  }
  if (state.repairQuestionsAsked < MIN_REPAIR_QUESTIONS || !state.repairComplete) {
    return 'repair';
  }
  return 'repair';
}

function isGapExplorationComplete(state: ConversationState): boolean {
  if ((state.gapExplorationStep ?? 0) >= MIN_GAP_EXPLORATION_STEPS) return true;
  if (
    state.reconciliationDetected &&
    state.identifiedGaps.length > 0 &&
    state.identifiedGaps.every((g) => g.resolved && g.resolvedByMutualUnderstanding) &&
    (state.gapExplorationStep ?? 0) >= MIN_GAP_EXPLORATION_STEPS - 1 &&
    bothPartnersAcknowledgedPerspective(state)
  ) {
    return true;
  }
  return false;
}

function bothPartnersAcknowledgedPerspective(state: ConversationState): boolean {
  const ackPattern =
    /rozumiem|uznaj[eę]|doceniam|przepraszam|thank you|i understand|i'?m sorry|i appreciate/i;
  const facts = state.factMemory.filter((f) => ackPattern.test(f.fact));
  const speakers = new Set(facts.map((f) => f.speaker));
  return speakers.has('partnerA') && speakers.has('partnerB');
}

function canEnterResponsibility(state: ConversationState): boolean {
  return isGapExplorationComplete(state) && unresolvedGaps(state).length === 0;
}

function canEnterRepair(state: ConversationState): boolean {
  if (!isGapExplorationComplete(state) || unresolvedGaps(state).length > 0) return false;
  if (state.reconciliationDetected && state.responsibilityComplete) return true;
  return (
    state.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS &&
    Boolean(state.responsibilityComplete)
  );
}

function advanceAfterBothAnswered(
  state: ConversationState,
  hadBothAnswers: boolean
): ConversationState {
  if (!hadBothAnswers || !state.currentQuestion || state.currentQuestion.answered) {
    return state;
  }

  const next: ConversationState = {
    ...state,
    currentQuestion: { ...state.currentQuestion, answered: true },
  };

  const answeredQ = next.currentQuestion;
  if (!answeredQ) return next;

  const phase = answeredQ.phase;
  if (phase === 'gap' || phase === 'conflict' || phase === 'deepen') {
    next.gapExplorationStep = Math.min(
      MIN_GAP_EXPLORATION_STEPS,
      (next.gapExplorationStep ?? 0) + 1
    );
  }

  if (phase === 'repair') {
    const completed = (next.repairStep ?? 0) + 1;
    next.repairStep = completed;
    next.repairQuestionsAsked = Math.max(next.repairQuestionsAsked, completed);
    if (completed >= REPAIR_STEPS_COUNT || answeredQ.id === 'repair_stress_test') {
      next.repairStep = REPAIR_STEPS_COUNT;
      next.repairQuestionsAsked = Math.max(next.repairQuestionsAsked, REPAIR_STEPS_COUNT);
      next.repairComplete = true;
      next.conversationFinished = true;
    }
  }

  return next;
}

function isRepairStressTestQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /zawiedzie w następnym|zawiedzie.*konflikcie|rule fails|pause and return to emotions/i.test(
      t
    ) || t.includes('repair_stress_test')
  );
}

function isReadyForProposedSolution(state: ConversationState): boolean {
  return (
    state.repairComplete ||
    state.conversationFinished ||
    (state.repairStep ?? 0) >= REPAIR_STEPS_COUNT ||
    state.currentQuestion?.id === 'repair_stress_test'
  );
}

function truncateSafeSentence(text: string, maxLen = 220): string {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return '';
  if (trimmed.length <= maxLen) return stripDanglingQuotes(trimmed);

  const slice = trimmed.slice(0, maxLen);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n')
  );
  let pick =
    sentenceEnd >= 24 ? slice.slice(0, sentenceEnd + 1).trimEnd() : slice.trimEnd();
  pick = stripDanglingQuotes(pick);
  if (pick.length < trimmed.length && !pick.endsWith('…')) {
    pick = `${pick.replace(/[.,;:!?…]+$/g, '').trimEnd()}…`;
  }
  return pick;
}

function stripDanglingQuotes(text: string): string {
  let out = text.trimEnd();
  const openGuillemet = (out.match(/„/g) || []).length;
  const closeGuillemet = (out.match(/"/g) || []).length;
  if (openGuillemet > closeGuillemet) {
    const lastOpen = out.lastIndexOf('„');
    if (lastOpen >= 0) {
      out = out.slice(0, lastOpen).trimEnd();
      if (out && !out.endsWith('…')) out = `${out}…`;
    }
  }
  const straight = (out.match(/"/g) || []).length;
  if (straight % 2 !== 0) {
    const lastOpen = out.lastIndexOf('"');
    if (lastOpen >= 0) {
      out = out.slice(0, lastOpen).trimEnd();
      if (out && !out.endsWith('…')) out = `${out}…`;
    }
  }
  return out.replace(/[«»]+$/g, '').trimEnd();
}

function extractCommitmentFromAnswer(answer: string, maxLen = 220): string {
  const trimmed = answer?.trim() ?? '';
  if (!trimmed) return '';
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const actionPattern =
    /zatrzym|przerw|wróc|wrócę|powiem|poczuj|poczek|zrobię|będę|stop|pause|return|will say|when i/i;
  const action = sentences.find((s) => actionPattern.test(s));
  const pick = (action || sentences[0] || trimmed).trim();
  return truncateSafeSentence(pick, maxLen);
}

function defaultSharedRuleLocal(language: string): string {
  return defaultSharedRule(language);
}

function defaultFallbackPlanLocal(language: string): string {
  return defaultFallbackPlan(language);
}

function extractFinalCommitments(
  partnerAAnswer: string,
  partnerBAnswer: string,
  language: string
): FinalCommitments {
  return {
    partnerA: extractCommitmentFromAnswer(partnerAAnswer),
    partnerB: extractCommitmentFromAnswer(partnerBAnswer),
    sharedRule: defaultSharedRuleLocal(language),
    fallbackPlan: defaultFallbackPlanLocal(language),
  };
}

function completeRepairFlow(
  state: ConversationState,
  partnerAAnswer = '',
  partnerBAnswer = '',
  language = 'pl'
): ConversationState {
  const commitments =
    state.finalCommitments ??
    extractFinalCommitments(partnerAAnswer, partnerBAnswer, language);
  const next: ConversationState = {
    ...state,
    repairStep: REPAIR_STEPS_COUNT,
    repairQuestionsAsked: Math.max(state.repairQuestionsAsked, REPAIR_STEPS_COUNT),
    repairComplete: true,
    conversationFinished: true,
    finalCommitments: commitments,
    currentQuestion: state.currentQuestion
      ? {
          ...state.currentQuestion,
          id: 'repair_stress_test',
          topic: 'repair_stress_test',
          answered: true,
        }
      : {
          id: 'repair_stress_test',
          phase: 'repair',
          topic: 'repair_stress_test',
          askedAtQuestionNumber: state.questionCount,
          answered: true,
        },
  };
  return finalizeConversationIfReady(next);
}

function shouldCompleteRepairFromTranscript(
  state: ConversationState,
  hadBothAnswers: boolean,
  recentMessages: RecentMessage[]
): boolean {
  if (!hadBothAnswers) return false;
  if (state.repairComplete || (state.repairStep ?? 0) >= REPAIR_STEPS_COUNT) return true;
  if (state.currentQuestion?.id === 'repair_stress_test') return true;
  const lastQ = extractLastQuestion(recentMessages);
  return Boolean(lastQ && isRepairStressTestQuestion(lastQ));
}

function applyPostAnswerStateAdvance(
  state: ConversationState,
  body: Record<string, unknown>
): ConversationState {
  const language = normalizeLanguage(body.language);
  const hostUserId = typeof body.userId === 'string' ? body.userId : '';
  const recentMessages = (body.recentMessages as RecentMessage[]) ?? [];
  const prevQuestionCount = (body.questionNumber as number) ?? 0;
  const hadBothAnswers =
    extractLastRoundAnswers(recentMessages).length >= 2 && prevQuestionCount > 0;

  let next = state;
  if (hadBothAnswers) {
    next = advanceAfterBothAnswered(next, hadBothAnswers);
    if (shouldCompleteRepairFromTranscript(next, hadBothAnswers, recentMessages)) {
      const round = extractRoundAnswersByPartner(recentMessages, hostUserId);
      next = completeRepairFlow(
        next,
        round.partnerAAnswer,
        round.partnerBAnswer,
        language
      );
    }
  }
  return next;
}

function formatProposedSolutionMessage(
  state: ConversationState,
  language: string,
  nameA: string,
  nameB: string
): string {
  const c = state.finalCommitments ?? {};
  const fallbackPlan = c.fallbackPlan ?? defaultFallbackPlanLocal(language);
  const commitA = c.partnerA || defaultCommitmentA(language, nameA);
  const commitB = c.partnerB || defaultCommitmentB(language, nameB);
  return i18nFormatProposedSolutionMessage(language, nameA, nameB, commitA, commitB, fallbackPlan);
}

function buildRepairClosureHints(language: string): Pick<
  LiveMediatorResponse,
  'privateHint' | 'partnerPrivateHint'
> {
  const tone = i18nBuildRepairClosureHints(language).tone;
  return {
    privateHint: { tone },
    partnerPrivateHint: { tone },
  };
}

function wouldRepeatQuestion(
  state: ConversationState,
  topicId: string,
  questionText: string,
  recentMessages: RecentMessage[]
): boolean {
  const lastQ = extractLastQuestion(recentMessages);
  if (state.currentQuestion && !state.currentQuestion.answered && state.currentQuestion.id === topicId) {
    return true;
  }
  if (state.currentQuestion?.answered && state.currentQuestion.id === topicId) {
    return true;
  }
  if (lastQ && isDuplicate(questionText, lastQ)) return true;
  return false;
}

function buildGapExplorationStepQuestion(
  step: number,
  language: string,
  openGap: IdentifiedGap | null,
  nameA: string,
  nameB: string
): { text: string; topicId: string } {
  const topicIndex = Math.min(Math.max(step, 0), GAP_STEP_TOPICS.length - 1);
  const topicId = GAP_STEP_TOPICS[topicIndex];
  const gapDesc = humanizeGapDescription(openGap, language);
  const named = hasParticipantNames(nameA, nameB);

  if (topicId === 'gap_facts') {
    return { topicId, text: gapFactsQuestion(language) };
  }
  if (topicId === 'gap_interpretation') {
    return { topicId, text: gapInterpretationQuestion(language, gapDesc) };
  }
  if (topicId === 'gap_acknowledgment') {
    return {
      topicId,
      text: gapAcknowledgmentQuestion(language, nameA, nameB, named),
    };
  }
  return {
    topicId,
    text: gapUnresolvedQuestion(language, gapDesc),
  };
}

function buildRepairStepQuestion(
  step: number,
  language: string,
  nameA: string,
  nameB: string
): { text: string; topicId: string } {
  const topicIndex = Math.min(Math.max(step, 0), REPAIR_STEP_TOPICS.length - 1);
  const topicId = REPAIR_STEP_TOPICS[topicIndex];
  const named = hasParticipantNames(nameA, nameB);

  if (topicId === 'repair_rule') {
    return {
      topicId,
      text: stripQuestionTargetPrefix(
        i18nBuildReconciliationRepairQuestion(language, nameA, nameB, named)
      ),
    };
  }
  if (topicId === 'repair_check') {
    return { topicId, text: repairCheckQuestion(language) };
  }
  return { topicId, text: repairStressTestQuestion(language) };
}

function buildBothPartnersGapFallback(
  state: ConversationState,
  language: string,
  openGap: IdentifiedGap | null,
  nameA: string,
  nameB: string
): { text: string; topicId: string } {
  const step = state.gapExplorationStep ?? 0;
  return buildGapExplorationStepQuestion(step, language, openGap, nameA, nameB);
}

function isReadyForMidSummary(state: ConversationState): boolean {
  return (
    unresolvedGaps(state).length === 0 &&
    state.responsibilityQuestionsAsked >= 1 &&
    state.questionCount >= Math.floor(state.sessionQuestionBudget / 2) &&
    !state.midSummaryShown
  );
}

function isReadyForFinalSummary(state: ConversationState): boolean {
  const repairDone =
    state.repairComplete ||
    (state.repairStep ?? 0) >= REPAIR_STEPS_COUNT ||
    state.repairQuestionsAsked >= MIN_REPAIR_QUESTIONS;
  return (
    (state.conversationFinished || repairDone) &&
    unresolvedGaps(state).length === 0 &&
    state.mainConflictQuestionAsked &&
    isGapExplorationComplete(state) &&
    (state.responsibilityComplete || Boolean(state.reconciliationDetected)) &&
    repairDone
  );
}

function normalizeQuestion(text: string): string {
  return semanticKey(stripQuestionPrefix(text));
}

function questionContainsQuotedGapTitle(text: string): boolean {
  return /[«»"“”]/.test(text);
}

function humanizeGapDescription(gap: IdentifiedGap | null, language: string): string {
  const raw = (gap?.description ?? '').trim().replace(/[«»"“”]/g, '').trim();
  if (!raw) {
    return humanizeGapDefault(language);
  }
  const abstract =
    /^(brak|lack|different|różne|nieporozumienie|misunderstanding|wzajemne|mutual)/i.test(raw) &&
    raw.length < 90;
  if (abstract || /brak wzajemnego|lack of mutual|zrozumienia emocji|emotional understanding/i.test(raw)) {
    return humanizeGapAbstract(language);
  }
  return raw;
}

function hasOpeningContentInRecentMessages(recentMessages: RecentMessage[]): boolean {
  return recentMessages.some(
    (m) =>
      m.message_type === 'summary' ||
      m.metadata?.summaryKind === 'opening_summary' ||
      m.metadata?.summaryKind === 'opening' ||
      (m.message_type === 'question' &&
        (m.metadata?.questionId === 'gap_facts' || m.metadata?.replyToQuestionId === 'gap_facts'))
  );
}

function shouldBlockDuplicateOpening(
  state: ConversationState,
  recentMessages: RecentMessage[]
): boolean {
  return state.openingSummaryDone || hasOpeningContentInRecentMessages(recentMessages);
}

function extractAnswersForQuestion(
  recentMessages: RecentMessage[],
  questionId: string | null | undefined,
  hostUserId: string,
  partnerUserIds: string[] = []
): { partnerAAnswer: string; partnerBAnswer: string; answers: string[]; count: number } {
  if (questionId) {
    const tagged = recentMessages.filter(
      (m) =>
        m.message_type === 'message' &&
        m.content?.trim() &&
        m.metadata?.replyToQuestionId === questionId
    );
    if (tagged.length > 0) {
      let partnerAAnswer = '';
      let partnerBAnswer = '';
      for (const m of tagged) {
        if (hostUserId && m.sender_id === hostUserId) partnerAAnswer = m.content!.trim();
        else if (m.sender_id && m.sender_id !== 'ai') partnerBAnswer = m.content!.trim();
      }
      const answers = tagged.map((m) => m.content!.trim()).slice(-2);
      return {
        partnerAAnswer,
        partnerBAnswer,
        answers,
        count: tagged.length,
      };
    }
  }
  const legacy = extractLastRoundAnswers(recentMessages);
  const round = extractRoundAnswersByPartner(recentMessages, hostUserId);
  return {
    partnerAAnswer: round.partnerAAnswer,
    partnerBAnswer: round.partnerBAnswer,
    answers: legacy,
    count: round.count,
  };
}

function semanticKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(' ')
    .filter((w) => w.length > 4)
    .sort()
    .slice(0, 10)
    .join('|');
}

function isDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  return semanticKey(a) === semanticKey(b);
}

function truncateForQuestion(text: string, max = 220): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function getGapById(state: ConversationState, gapId: string): IdentifiedGap | null {
  return state.identifiedGaps.find((g) => g.id === gapId) ?? null;
}

function slugGapId(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('_');
  return base ? `${base}_gap` : `gap_${index + 1}`;
}

function detectEscalationScore(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  if (t.includes('zawsze') || t.includes('always')) score++;
  if (t.includes('nigdy') || t.includes('never')) score++;
  if (t.includes('twoja wina') || t.includes('your fault')) score += 2;
  if (t.includes('zamknij') || t.includes('shut up')) score += 3;
  return score;
}

const MUTUAL_UNDERSTANDING_REASON =
  "Both partners acknowledged each other's emotions and intentions, and the conversation showed signs of relief or reconciliation.";

function scoreReconciliationSignal(text: string, language: string): number {
  const strong = getReconciliationStrongPatterns(language);
  for (const pattern of strong) {
    if (pattern.test(text)) return 2;
  }
  const patterns = getReconciliationPatterns(language);
  let score = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) score++;
  }
  return score;
}

function isReconciliationMessage(text: string, language: string): boolean {
  return scoreReconciliationSignal(text, language) > 0;
}

function hasRecentAggression(recentMessages: RecentMessage[]): boolean {
  return recentMessages
    .filter((m) => m.message_type === 'message' && m.content?.trim())
    .slice(-6)
    .some((m) => detectEscalationScore(m.content!) >= 2);
}

function detectReconciliationSignals(
  recentMessages: RecentMessage[],
  _state: ConversationState,
  language = 'pl'
): { detected: boolean; score: number; reason: string } {
  const partnerMessages = recentMessages
    .filter((m) => m.message_type === 'message' && m.content?.trim() && m.sender_id !== 'ai')
    .slice(-6);

  let score = 0;
  const reasons: string[] = [];
  for (const m of partnerMessages) {
    const signalScore = scoreReconciliationSignal(m.content!, language);
    if (signalScore > 0) {
      score += signalScore;
      reasons.push(m.content!.trim().slice(0, 48));
    }
  }

  const detected = score >= 2 && !hasRecentAggression(recentMessages);
  return {
    detected,
    score,
    reason: detected ? reasons.join('; ') : '',
  };
}

function isHardPressingQuestion(question: string, language: string): boolean {
  const t = question.toLowerCase();
  if (language === 'en') {
    return (
      /why\s+are\s+you\s+avoiding/i.test(t) ||
      /why\s+don'?t\s+you\s+address/i.test(t) ||
      /why\s+don'?t\s+you\s+respond/i.test(t) ||
      /while\s+(your\s+)?partner\s+(says|talks|speaks)/i.test(t) ||
      /why\s+do\s+you\s+avoid/i.test(t)
    );
  }
  return (
    /dlaczego\s+unikasz/i.test(t) ||
    /dlaczego\s+nie\s+(odnosisz|odnosisz\s+się|wyjaśniasz|odpowiadasz)/i.test(t) ||
    /podczas\s+gdy\s+partner/i.test(t) ||
    /czemu\s+(wciąż|ciągle|nadal)/i.test(t) ||
    /dlaczego\s+nie\s+wyjaśniasz/i.test(t)
  );
}

function buildReconciliationTransitionMessage(language: string): string {
  return i18nBuildReconciliationTransitionMessage(language);
}

function buildReconciliationRepairQuestion(
  language: string,
  nameA: string,
  nameB: string
): string {
  return i18nBuildReconciliationRepairQuestion(language, nameA, nameB, hasParticipantNames(nameA, nameB));
}

function buildGenericRepairBothQuestion(language: string): string {
  return i18nBuildGenericRepairBothQuestion(language);
}

function stripQuestionTargetPrefix(question: string): string {
  return question.trim().replace(/^🎯\s*@[^:]+:\s*/i, '').trim();
}

function isSingleTargetedQuestion(
  question: string,
  nameA: string,
  nameB: string,
  _language: string
): boolean {
  const bare = stripQuestionTargetPrefix(question);
  const names = [nameA, nameB].filter((n) => n && !/^partner\s/i.test(n));
  if (names.some((name) => new RegExp(`^${name}\\b`, 'i').test(bare))) return true;
  if (/^🎯\s*@[^:]+:/i.test(question) && !/oboje|both|entrambi|beide|ambos|tous les deux/i.test(question)) {
    return true;
  }
  return false;
}

function bothPartnersShowedReconciliationEffort(
  recentMessages: RecentMessage[],
  hostUserId: string,
  language: string
): boolean {
  const round = extractRoundAnswersByPartner(recentMessages, hostUserId);
  const aScore = round.partnerAAnswer
    ? scoreReconciliationSignal(round.partnerAAnswer, language)
    : 0;
  const bScore = round.partnerBAnswer
    ? scoreReconciliationSignal(round.partnerBAnswer, language)
    : 0;
  return aScore > 0 && bScore > 0;
}

function markGapResolvedByMutualUnderstanding(state: ConversationState): ConversationState {
  if (!state.activeGapId) {
    const next = { ...state };
    if (unresolvedGaps(next).length === 0 && next.mainConflictQuestionAsked) {
      next.responsibilityReady = true;
    }
    next.phase = resolveConversationPhase(next);
    return next;
  }

  const updatedGaps = state.identifiedGaps.map((g) =>
    g.id === state.activeGapId
      ? {
          ...g,
          resolved: true,
          deadlocked: false,
          resolvedByMutualUnderstanding: true,
          resolutionReason: MUTUAL_UNDERSTANDING_REASON,
          confidence: Math.max(g.confidence ?? 0, 85),
        }
      : g
  );
  const nextGap = selectNextGap({ ...state, identifiedGaps: updatedGaps });
  const nextActiveGapId = nextGap?.id ?? null;
  const nextState = {
    ...state,
    identifiedGaps: updatedGaps,
    activeGapId: nextActiveGapId,
    evasionStreak: 0,
  };
  if (unresolvedGaps(nextState).length === 0 && nextState.mainConflictQuestionAsked) {
    nextState.responsibilityReady = true;
  }
  return {
    ...nextState,
    phase: nextGap
      ? 'gap_exploration'
      : resolveConversationPhase({ ...nextState, activeGapId: nextActiveGapId }),
  };
}

function applyReconciliationClosure(
  state: ConversationState,
  recentMessages: RecentMessage[],
  hostUserId: string,
  language: string
): ConversationState {
  const signals = detectReconciliationSignals(recentMessages, state, language);
  if (!signals.detected && !state.reconciliationDetected) return state;

  let next: ConversationState = {
    ...state,
    reconciliationDetected: true,
    emotionalResolutionDetected: true,
    reconciliationScore: signals.score || state.reconciliationScore,
    reconciliationReason: signals.reason || state.reconciliationReason,
    evasionStreak: 0,
  };

  next = markGapResolvedByMutualUnderstanding(next);
  next.responsibilityReady = true;

  if (bothPartnersShowedReconciliationEffort(recentMessages, hostUserId, language)) {
    next.responsibilityComplete = true;
    next.responsibilityQuestionsAsked = Math.max(
      next.responsibilityQuestionsAsked,
      MIN_RESPONSIBILITY_QUESTIONS
    );
  }

  if (unresolvedGaps(next).length === 0 && isGapExplorationComplete(next)) {
    next.responsibilityReady = true;
    if (next.reconciliationDetected && next.responsibilityComplete) {
      next.phase = 'repair';
    }
  }

  return finalizeConversationIfReady(next);
}

function shouldAllowSingleTargetQuestion(
  question: string,
  state: ConversationState,
  recentMessages: RecentMessage[],
  hostUserId: string,
  language: string,
  nameA: string,
  nameB: string,
  brain: MediatorBrainResult
): boolean {
  if (!isSingleTargetedQuestion(question, nameA, nameB, language)) return true;
  if (state.reconciliationDetected || state.emotionalResolutionDetected) return false;
  const round = extractRoundAnswersByPartner(recentMessages, hostUserId);
  if (round.count < 2) return true;
  if (brain.evasionDetected) return true;
  if (hasRecentAggression(recentMessages)) return true;
  const latestContradiction = state.contradictions.at(-1);
  if (latestContradiction && latestContradiction.severity >= 60) return true;
  return false;
}

function buildReconciliationPrivateHints(
  language: string,
  hostName: string,
  partnerName: string,
  partnerAAnswer: string,
  partnerBAnswer: string
): LiveMediatorResponse {
  const hostLabel = hostName || 'Partner A';
  const partnerLabel = partnerName || partnerBDefaultLabel(language);
  const hostShowsEffort = scoreReconciliationSignal(partnerAAnswer, language) > 0;
  const partnerShowsEffort = scoreReconciliationSignal(partnerBAnswer, language) > 0;
  const hints = i18nBuildReconciliationPrivateHints(language, partnerLabel, hostLabel);
  return {
    privateHint: {
      tone: hostShowsEffort ? hints.hostHint : hints.hostFallback,
    },
    partnerPrivateHint: {
      tone: partnerShowsEffort ? hints.partnerHint : hints.partnerFallback,
    },
  };
}

function progressFromQuestion(n: number, max: number): number {
  return Math.min(100, Math.max(5, Math.round((n / Math.max(max, 1)) * 100)));
}

function stripQuestionPrefix(content: string): string {
  return content.trim().replace(/^🎯\s*@[^:]+:\s*/i, '').trim();
}

function extractLastRoundAnswers(recentMessages: RecentMessage[]): string[] {
  let lastQ = -1;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (recentMessages[i].message_type === 'question') {
      lastQ = i;
      break;
    }
  }
  if (lastQ < 0) return [];
  return recentMessages
    .slice(lastQ + 1)
    .filter((m) => m.message_type === 'message' && m.content?.trim())
    .map((m) => m.content!.trim())
    .slice(-2);
}

function extractRoundAnswersByPartner(
  recentMessages: RecentMessage[],
  hostUserId: string
): { partnerAAnswer: string; partnerBAnswer: string; count: number } {
  let lastQ = -1;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    if (recentMessages[i].message_type === 'question') {
      lastQ = i;
      break;
    }
  }
  if (lastQ < 0) return { partnerAAnswer: '', partnerBAnswer: '', count: 0 };
  let partnerAAnswer = '';
  let partnerBAnswer = '';
  let count = 0;
  for (const m of recentMessages.slice(lastQ + 1)) {
    if (m.message_type !== 'message' || !m.content?.trim()) continue;
    count++;
    if (hostUserId && m.sender_id === hostUserId) {
      partnerAAnswer = m.content.trim();
    } else if (m.sender_id && m.sender_id !== 'ai') {
      partnerBAnswer = m.content.trim();
    }
  }
  return { partnerAAnswer, partnerBAnswer, count };
}

function extractLastQuestion(recentMessages: RecentMessage[]): string {
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const m = recentMessages[i];
    if (m.message_type === 'question' && m.content?.trim()) {
      return stripQuestionPrefix(m.content);
    }
  }
  return '';
}

function extractAllMediatorQuestions(recentMessages: RecentMessage[]): string[] {
  const questions: string[] = [];
  for (const m of recentMessages) {
    if (m.message_type === 'question' && m.content?.trim()) {
      questions.push(stripQuestionPrefix(m.content));
    }
  }
  return questions.slice(-20);
}

function buildRichTranscript(
  recentMessages: RecentMessage[],
  hostUserId?: string
): string {
  const slice = recentMessages.slice(-TRANSCRIPT_LIMIT);
  const lines: string[] = [];
  for (const m of slice) {
    if (!m.content?.trim()) continue;
    if (m.message_type === 'question') {
      lines.push(`[MEDIATOR] ${stripQuestionPrefix(m.content)}`);
    } else if (m.message_type === 'message') {
      const label =
        hostUserId && m.sender_id === hostUserId
          ? 'PARTNER_A'
          : m.sender_id && m.sender_id !== 'ai'
            ? 'PARTNER_B'
            : 'PARTNER';
      lines.push(`[${label}] ${m.content.trim()}`);
    }
  }
  return lines.join('\n');
}

function stringFromAnalysis(
  analysis: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!analysis) return '';
  for (const k of keys) {
    const v = analysis[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function containsConcreteSignal(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/\b\d{1,2}[:.]\d{2}\b/.test(t)) return true;
  if (/\b\d{1,2}\s*(am|pm)\b/i.test(text)) return true;
  if (/\bo\s+\d{1,2}([:.]\d{0,2})?\b/i.test(t)) return true;
  if (/\bat\s+\d{1,2}([:.]\d{0,2})?\b/i.test(t)) return true;
  if (/\b\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?\b/.test(t)) return true;
  if (/\b(wczoraj|jutro|dzisiaj|yesterday|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|poniedziałek|wtorek|środa|sroda|czwartek|piątek|piatek|sobota|niedziela)\b/i.test(t)) {
    return true;
  }
  if (/\b(w pracy|at work|w domu|at home|w szpitalu|in hospital|na uczelni|at school)\b/i.test(t)) {
    return true;
  }
  if (/\b(napisałem|napisałam|napisałeś|napisałaś|texted|wrote|wyszedłem|wyszłam|wyszedłeś|wyszłaś|left home|left|przeprosiłem|przeprosiłam|przeprosiłeś|przeprosiłaś|apologiz)\b/i.test(t)) {
    return true;
  }
  if (/\b(nie|no),?\s+(byłem|byłam|byłeś|byłaś|jestem|i was|i am|było|were)\b/i.test(t)) return true;
  if (/\b(tak|yes),?\s+o?\s*\d/i.test(t)) return true;
  if (/\b(nie pamiętam dokładnie|nie pamietam dokladnie|do not remember exactly|don't remember exactly|i do not remember exactly)\b/i.test(t)) {
    return true;
  }
  if (/\b(przyznałem|przyznałam|przyznaję|przyznaje|admit|i admit)\b/i.test(t)) return true;
  return false;
}

function isPureDeflection(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  const patterns =
    /\b(nie wiem|no nie wiem|bo tak|bo tak wyszło|tak wyszło|no normalnie|normalnie|już mówiłem|juz mowilem|nie chce mi się|nie chce mi sie|to bez sensu|bez sensu|nieważne|obojętnie|może|i don'?t know|because|whatever|i already said|i don'?t want to|this is pointless|pointless|not sure|doesn'?t matter|that'?s how it went)\b/i;
  if (patterns.test(t)) return true;
  if (/^(bo|because)\.?$/i.test(t)) return true;
  if (/^(nie wiem|no nie wiem|whatever|bo tak)\.?$/i.test(t)) return true;
  return false;
}

function isAnswerEvasive(answer: string, _question: string, language: string): boolean {
  const trimmed = answer.trim();
  if (!trimmed) return true;
  if (isReconciliationMessage(trimmed, language)) return false;
  if (isPureDeflection(trimmed)) return true;
  if (containsConcreteSignal(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length <= 5;
}

function detectEvasiveAnswers(answers: string[], question: string, language: string): boolean {
  if (answers.length < 2) return false;
  return answers.some((answer) => isAnswerEvasive(answer, question, language));
}

/** @deprecated alias — use detectEvasiveAnswers */
function heuristicEvasion(answers: string[], question: string, language: string): boolean {
  return detectEvasiveAnswers(answers, question, language);
}

function shouldResolveGap(
  gap: IdentifiedGap,
  brain: MediatorBrainResult,
  hasOpenAi: boolean
): boolean {
  if (brain.evasionDetected || gap.resolved || gap.resolvedByMutualUnderstanding) return false;
  if (hasOpenAi) {
    return (
      brain.activeGapResolved && brain.gapResolveConfidence >= GAP_RESOLVE_CONFIDENCE_MIN
    );
  }
  return gap.discussionRounds >= NO_API_GAP_ROUNDS_FALLBACK;
}

function discoverNewGaps(brain: MediatorBrainResult): IdentifiedGap[] {
  if (!brain.newGapDetected || !brain.newGap?.id || !brain.newGap.description) {
    return [];
  }
  return [
    {
      id: brain.newGap.id,
      description: brain.newGap.description,
      resolved: false,
      discussionRounds: 0,
      priority: DEFAULT_GAP_PRIORITY,
    },
  ];
}

function incrementDiscussionRoundForActiveGap(state: ConversationState): ConversationState {
  if (!state.activeGapId) return state;
  return {
    ...state,
    identifiedGaps: state.identifiedGaps.map((g) =>
      g.id === state.activeGapId ? { ...g, discussionRounds: g.discussionRounds + 1 } : g
    ),
  };
}

function evasionDeadlockPrompt(language: string): string {
  return i18nEvasionDeadlockPrompt(language);
}

function markGapDeadlockedAndAdvance(
  state: ConversationState,
  resolutionReason: string
): ConversationState {
  if (!state.activeGapId) return state;
  const updatedGaps = state.identifiedGaps.map((g) =>
    g.id === state.activeGapId
      ? {
          ...g,
          resolved: true,
          deadlocked: true,
          resolutionReason,
        }
      : g
  );
  const nextGap = selectNextGap({ ...state, identifiedGaps: updatedGaps });
  const nextActiveGapId = nextGap?.id ?? null;
  const nextState = {
    ...state,
    identifiedGaps: updatedGaps,
    activeGapId: nextActiveGapId,
    showEvasionDeadlockMessage: true,
  };
  if (unresolvedGaps(nextState).length === 0 && nextState.mainConflictQuestionAsked) {
    nextState.responsibilityReady = true;
  }
  return {
    ...nextState,
    phase: nextGap
      ? 'gap_exploration'
      : resolveConversationPhase({ ...nextState, activeGapId: nextActiveGapId }),
  };
}

function markGapResolvedAndAdvance(
  state: ConversationState,
  resolutionReason?: string,
  confidence?: number
): ConversationState {
  if (!state.activeGapId) return state;
  const updatedGaps = state.identifiedGaps.map((g) =>
    g.id === state.activeGapId
      ? {
          ...g,
          resolved: true,
          resolutionReason: resolutionReason ?? g.resolutionReason,
          confidence: confidence ?? g.confidence ?? GAP_RESOLVE_CONFIDENCE_MIN,
        }
      : g
  );
  const nextGap = selectNextGap({ ...state, identifiedGaps: updatedGaps });
  const nextActiveGapId = nextGap?.id ?? null;
  const nextState = {
    ...state,
    identifiedGaps: updatedGaps,
    activeGapId: nextActiveGapId,
  };
  return {
    ...nextState,
    phase: nextGap
      ? 'gap_exploration'
      : resolveConversationPhase({ ...nextState, activeGapId: nextActiveGapId }),
  };
}

function mergeNewGaps(state: ConversationState, incoming: IdentifiedGap[]): ConversationState {
  if (incoming.length === 0) return state;
  const existingIds = new Set(state.identifiedGaps.map((g) => g.id));
  const existingDesc = new Set(state.identifiedGaps.map((g) => semanticKey(g.description)));
  const toAdd: IdentifiedGap[] = [];
  for (const g of incoming.slice(0, MAX_NEW_GAPS_PER_MERGE)) {
    if (existingIds.has(g.id)) continue;
    if (existingDesc.has(semanticKey(g.description))) continue;
    toAdd.push({ ...g, resolved: false, discussionRounds: 0, priority: g.priority ?? DEFAULT_GAP_PRIORITY });
    if (toAdd.length >= MAX_NEW_GAPS_PER_MERGE) break;
  }
  if (toAdd.length === 0) return state;
  const identifiedGaps = [...state.identifiedGaps, ...toAdd].slice(0, 12);
  const nextActive = selectNextGap({ ...state, identifiedGaps });
  const activeGapId = state.activeGapId ?? nextActive?.id ?? toAdd[0]?.id ?? null;
  return {
    ...state,
    identifiedGaps,
    activeGapId,
    phase: 'gap_exploration',
    responsibilityReady: false,
    responsibilityComplete: false,
    repairComplete: false,
    midSummaryEligible: false,
    conversationFinished: false,
    sessionQuestionBudget: Math.min(
      QUESTIONS_BUDGET_MAX,
      state.sessionQuestionBudget + toAdd.length * 2
    ),
  };
}

function applyBrainEvaluation(
  state: ConversationState,
  brain: MediatorBrainResult,
  hadBothAnswers: boolean,
  opts?: {
    partnerAAnswer?: string;
    partnerBAnswer?: string;
    questionIndex?: number;
    hasOpenAi?: boolean;
    language?: string;
    recentMessages?: RecentMessage[];
    hostUserId?: string;
  }
): ConversationState {
  let next = { ...state };
  const hasOpenAi = opts?.hasOpenAi ?? true;

  if (hadBothAnswers) {
    const recentForRecon =
      opts?.recentMessages ??
      [
        ...(opts?.partnerAAnswer
          ? [
              {
                message_type: 'message' as const,
                content: opts.partnerAAnswer,
                sender_id: opts.hostUserId || 'partnerA',
              },
            ]
          : []),
        ...(opts?.partnerBAnswer
          ? [
              {
                message_type: 'message' as const,
                content: opts.partnerBAnswer,
                sender_id: 'partnerB',
              },
            ]
          : []),
      ];
    const recon = detectReconciliationSignals(
      recentForRecon,
      next,
      opts?.language ?? 'pl'
    );
    if (recon.detected || next.reconciliationDetected) {
      next = applyReconciliationClosure(
        next,
        recentForRecon,
        opts?.hostUserId ?? '',
        opts?.language ?? 'pl'
      );
      if (isGapExplorationComplete(next)) {
        return finalizeConversationIfReady(next);
      }
    }
  }

  if (hadBothAnswers) {
    if (brain.evasionDetected) {
      next.evasionStreak = state.evasionStreak + 1;
    } else {
      next.evasionStreak = 0;
    }
    if (next.evasionStreak >= EVASION_STREAK_DEADLOCK && next.activeGapId) {
      const active = getGapById(next, next.activeGapId);
      if (active && !active.resolved) {
        next = markGapDeadlockedAndAdvance(
          next,
          'Gap closed as deadlocked after repeated evasive answers.'
        );
        next.evasionStreak = 0;
      }
    }
  }

  if (
    hadBothAnswers &&
    !brain.evasionDetected &&
    brain.partnerAAnswered &&
    brain.partnerBAnswered &&
    next.activeGapId
  ) {
    next = incrementDiscussionRoundForActiveGap(next);
  }

  const activeGap = next.activeGapId ? getGapById(next, next.activeGapId) : null;
  if (activeGap && shouldResolveGap(activeGap, brain, hasOpenAi)) {
    next = markGapResolvedAndAdvance(
      next,
      brain.gapResolveReason || 'Both partners gave concrete positions on this gap.',
      brain.gapResolveConfidence
    );
  } else if (activeGap && !activeGap.resolved && brain.gapResolveReason) {
    next = {
      ...next,
      identifiedGaps: next.identifiedGaps.map((g) =>
        g.id === activeGap.id
          ? {
              ...g,
              resolutionReason: brain.gapResolveReason,
              confidence: brain.gapResolveConfidence || g.confidence,
            }
          : g
      ),
    };
  }

  const newGaps = discoverNewGaps(brain);
  if (newGaps.length > 0) {
    next = mergeNewGaps(next, newGaps);
  }

  if (unresolvedGaps(next).length === 0 && next.mainConflictQuestionAsked) {
    next.responsibilityReady = canEnterResponsibility(next);
  } else if (unresolvedGaps(next).length === 0 && brain.readyForResponsibility) {
    next.responsibilityReady = canEnterResponsibility(next);
  }

  if (
    brain.responsibilityComplete &&
    next.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS
  ) {
    next.responsibilityComplete = true;
  }

  if (brain.repairComplete && next.repairQuestionsAsked >= MIN_REPAIR_QUESTIONS) {
    next.repairComplete = true;
  }

  if (brain.readyForMidSummary && unresolvedGaps(next).length === 0) {
    next.midSummaryEligible = true;
  }

  if (hadBothAnswers && opts?.partnerAAnswer && opts?.partnerBAnswer) {
    next = recordFactsFromAnswers(
      next,
      opts.partnerAAnswer,
      opts.partnerBAnswer,
      opts.questionIndex ?? next.questionCount,
      next.activeGapId
    );
    const lang = opts?.language ?? 'pl';
    const aStance = detectStanceChanges(
      next,
      'partnerA',
      opts.partnerAAnswer,
      next.activeGapId,
      opts.questionIndex ?? next.questionCount,
      lang
    );
    next = aStance.state;
    const bStance = detectStanceChanges(
      next,
      'partnerB',
      opts.partnerBAnswer,
      next.activeGapId,
      opts.questionIndex ?? next.questionCount,
      lang
    );
    next = bStance.state;
  }

  next = finalizeConversationIfReady(next);
  return next;
}

function buildConflictQuestion(
  perspectiveA: string,
  perspectiveB: string,
  language: string
): string {
  return i18nBuildConflictQuestion(
    truncateForQuestion(perspectiveA, 180),
    truncateForQuestion(perspectiveB, 180),
    language
  );
}

function fallbackDeepenQuestion(
  lastQuestion: string,
  answers: string[],
  language: string
): string {
  const evasivePatterns = EVASIVE_ANSWER_PATTERNS[normalizeLanguage(language)] ?? EVASIVE_ANSWER_PATTERNS.pl;
  const patternMatch = answers.find((a) => evasivePatterns.test(a));
  const evasiveAnswer =
    patternMatch ??
    answers.reduce(
      (shortest, a) => (a.trim().split(/\s+/).length < shortest.trim().split(/\s+/).length ? a : shortest),
      answers[0] ?? ''
    );
  return i18nFallbackDeepenQuestion(lastQuestion, evasiveAnswer, language);
}

function fallbackGapQuestion(gap: IdentifiedGap, language: string): string {
  return i18nFallbackGapQuestion(humanizeGapDescription(gap, language), gap.discussionRounds, language);
}

function pickFromBank(
  bank: string[],
  state: ConversationState,
  language: string,
  phase: 'responsibility' | 'repair'
): string {
  const unused = bank.filter((q) => {
    const sig = semanticKey(q);
    return !state.coveredTopics.includes(sig) && !isDuplicate(q, state.lastQuestionSignature);
  });
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  return bankExhaustedFallback(language, phase);
}

function updateStateAfterQuestion(
  state: ConversationState,
  question: string,
  questionNumber: number,
  gapId: string | null,
  questionKind: QuestionKind = 'gap',
  topicId?: string
): ConversationState {
  const sig = semanticKey(question);
  const responsibilityQuestionsAsked =
    questionKind === 'responsibility'
      ? state.responsibilityQuestionsAsked + 1
      : state.responsibilityQuestionsAsked;
  const repairQuestionsAsked =
    questionKind === 'repair' ? state.repairQuestionsAsked + 1 : state.repairQuestionsAsked;

  const resolvedTopicId =
    topicId ||
    (questionKind === 'repair'
      ? REPAIR_STEP_TOPICS[Math.min(state.repairStep ?? 0, REPAIR_STEP_TOPICS.length - 1)]
      : GAP_STEP_TOPICS[Math.min(state.gapExplorationStep ?? 0, GAP_STEP_TOPICS.length - 1)]);

  const nextState: ConversationState = {
    ...state,
    responsibilityQuestionsAsked,
    repairQuestionsAsked,
    questionCount: questionNumber,
    activeGapId: gapId ?? state.activeGapId,
    coveredTopics: [...state.coveredTopics, sig].slice(-20),
    lastQuestionSignature: sig,
    currentQuestion: {
      id: resolvedTopicId,
      phase: questionKind,
      topic: resolvedTopicId,
      askedAtQuestionNumber: questionNumber,
      answered: false,
    },
  };
  nextState.phase = resolveConversationPhase(nextState);
  return nextState;
}

function extractAnswerAckContext(
  body: Record<string, unknown>,
  state: ConversationState
): {
  activeQuestion: string;
  activeGap: string | null;
  partnerAAnswer: string;
  partnerBAnswer: string;
  transcript: string;
  previousQuestions: string[];
} {
  const recent = (body.recentMessages as RecentMessage[]) ?? [];
  const hostUserId = typeof body.userId === 'string' ? body.userId : '';
  const activeQuestion = extractLastQuestion(recent);
  const gap = state.activeGapId
    ? state.identifiedGaps.find((g) => g.id === state.activeGapId)
    : null;

  let lastQ = -1;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].message_type === 'question') {
      lastQ = i;
      break;
    }
  }

  let partnerAAnswer = '';
  let partnerBAnswer = '';
  if (lastQ >= 0) {
    for (const m of recent.slice(lastQ + 1)) {
      if (m.message_type !== 'message' || !m.content?.trim()) continue;
      if (hostUserId && m.sender_id === hostUserId) {
        partnerAAnswer = m.content.trim();
      } else if (m.sender_id && m.sender_id !== 'ai') {
        partnerBAnswer = m.content.trim();
      }
    }
  }

  return {
    activeQuestion,
    activeGap: gap?.resolved || gap?.resolvedByMutualUnderstanding ? null : gap?.description ?? null,
    partnerAAnswer,
    partnerBAnswer,
    transcript: buildRichTranscript(recent, hostUserId),
    previousQuestions: extractAllMediatorQuestions(recent),
  };
}

async function callOpenAIJson(
  apiKey: string,
  system: string,
  user: string,
  temperature = 0.55
): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI');
  return JSON.parse(content);
}

function parseBrainResult(raw: Record<string, unknown>): MediatorBrainResult {
  const newGapRaw = raw.newGap;
  let newGap: MediatorBrainResult['newGap'] = null;
  if (newGapRaw && typeof newGapRaw === 'object') {
    const g = newGapRaw as Record<string, unknown>;
    if (typeof g.id === 'string' && typeof g.description === 'string') {
      newGap = { id: g.id, description: g.description };
    }
  }
  return {
    partnerAAnswered: Boolean(raw.partnerAAnswered),
    partnerBAnswered: Boolean(raw.partnerBAnswered),
    evasionDetected: Boolean(raw.evasionDetected),
    evasionReason: typeof raw.evasionReason === 'string' ? raw.evasionReason : '',
    activeGapResolved: Boolean(raw.activeGapResolved),
    gapResolveConfidence:
      typeof raw.gapResolveConfidence === 'number' ? raw.gapResolveConfidence : 0,
    gapResolveReason: typeof raw.gapResolveReason === 'string' ? raw.gapResolveReason : '',
    newGapDetected: Boolean(raw.newGapDetected),
    newGap,
    readyForResponsibility: Boolean(raw.readyForResponsibility),
    responsibilityComplete: Boolean(raw.responsibilityComplete),
    repairComplete: Boolean(raw.repairComplete),
    readyForMidSummary: Boolean(raw.readyForMidSummary),
    conversationFinished: Boolean(raw.conversationFinished),
    question: typeof raw.question === 'string' ? raw.question.trim() : '',
  };
}

function buildBrainSystemPrompt(language: string): string {
  return i18nBuildBrainSystemPrompt(language);
}

function buildFallbackBrain(
  state: ConversationState,
  language: string,
  opts: {
    questionKind: QuestionKind;
    activeGap: IdentifiedGap | null;
    evasive: boolean;
    lastQuestion: string;
    lastAnswers: string[];
    convPhase: Phase;
  }
): MediatorBrainResult {
  const { questionKind, activeGap, evasive, lastQuestion, lastAnswers, convPhase } = opts;
  const bothAnswered = lastAnswers.length >= 2;

  if (state.reconciliationDetected || state.emotionalResolutionDetected) {
    return {
      partnerAAnswered: bothAnswered,
      partnerBAnswered: bothAnswered,
      evasionDetected: false,
      evasionReason: '',
      activeGapResolved: true,
      gapResolveConfidence: 85,
      gapResolveReason: MUTUAL_UNDERSTANDING_REASON,
      newGapDetected: false,
      newGap: null,
      readyForResponsibility: true,
      responsibilityComplete: Boolean(state.responsibilityComplete),
      repairComplete: false,
      readyForMidSummary: false,
      conversationFinished: false,
      question: stripQuestionTargetPrefix(
        buildReconciliationRepairQuestion(language, 'Partner A', 'Partner B')
      ),
    };
  }

  let question = '';
  if (questionKind === 'conflict') {
    question = buildConflictQuestion(state.perspectiveA, state.perspectiveB, language);
  } else if (evasive) {
    question = fallbackDeepenQuestion(lastQuestion, lastAnswers, language);
  } else if (activeGap) {
    question = fallbackGapQuestion(activeGap, language);
  } else if (convPhase === 'repair') {
    question = pickFromBank(getRepairBank(language), state, language, 'repair');
  } else {
    question = pickFromBank(getResponsibilityBank(language), state, language, 'responsibility');
  }

  const gap = activeGap;
  const stubBrain: MediatorBrainResult = {
    partnerAAnswered: bothAnswered && !evasive,
    partnerBAnswered: bothAnswered && !evasive,
    evasionDetected: evasive,
    evasionReason: evasive ? 'Heuristic evasion detected' : '',
    activeGapResolved: bothAnswered && !evasive,
    gapResolveConfidence: bothAnswered && !evasive ? 80 : 0,
    gapResolveReason: '',
    newGapDetected: false,
    newGap: null,
    readyForResponsibility: false,
    responsibilityComplete: false,
    repairComplete: false,
    readyForMidSummary: false,
    conversationFinished: false,
    question: '',
  };
  const gapResolved = !!gap && shouldResolveGap(gap, stubBrain, false);

  const allGapsResolved = unresolvedGaps(state).length === 0 || gapResolved;

  return {
    partnerAAnswered: bothAnswered && !evasive,
    partnerBAnswered: bothAnswered && !evasive,
    evasionDetected: evasive,
    evasionReason: evasive ? 'Heuristic evasion detected' : '',
    activeGapResolved: gapResolved,
    gapResolveConfidence: gapResolved ? 80 : 0,
    gapResolveReason: gapResolved ? 'Fallback: sufficient rounds without AI' : '',
    newGapDetected: false,
    newGap: null,
    readyForResponsibility: allGapsResolved && !evasive,
    responsibilityComplete:
      state.responsibilityReady &&
      state.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS &&
      !evasive,
    repairComplete:
      state.responsibilityComplete &&
      state.repairQuestionsAsked >= MIN_REPAIR_QUESTIONS &&
      !evasive,
    readyForMidSummary:
      allGapsResolved && state.questionCount >= Math.floor(state.sessionQuestionBudget / 2),
    conversationFinished:
      allGapsResolved &&
      state.responsibilityComplete &&
      state.repairComplete &&
      state.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS &&
      state.repairQuestionsAsked >= MIN_REPAIR_QUESTIONS,
    question,
  };
}

async function runMediatorBrain(
  apiKey: string | undefined,
  state: ConversationState,
  recentMessages: RecentMessage[],
  language: string,
  body: Record<string, unknown>,
  opts: {
    questionKind: QuestionKind;
    activeGap: IdentifiedGap | null;
    convPhase: Phase;
    questionNumber: number;
  }
): Promise<{ brain: MediatorBrainResult; aiRaw?: Record<string, unknown> }> {
  const hostUserId = typeof body.userId === 'string' ? body.userId : '';
  const transcript = buildRichTranscript(recentMessages, hostUserId);
  const previousQuestions = extractAllMediatorQuestions(recentMessages);
  const lastAnswers = extractLastRoundAnswers(recentMessages);
  const lastQuestion = extractLastQuestion(recentMessages);
  const evasiveHeuristic = detectEvasiveAnswers(lastAnswers, lastQuestion, language);

  if (!apiKey) {
    return {
      brain: buildFallbackBrain(state, language, {
        ...opts,
        evasive: evasiveHeuristic,
        lastQuestion,
        lastAnswers,
      }),
    };
  }

  const phaseHint =
    state.reconciliationDetected || state.emotionalResolutionDetected
      ? 'RECONCILIATION detected — do NOT press the same gap. Ask BOTH partners for one future rule. No blame, no "why do you avoid".'
      : opts.questionKind === 'conflict'
      ? 'FIRST conflict question: demand concrete factual events citing perspectiveA vs perspectiveB.'
      : opts.questionKind === 'deepen'
        ? 'EVASION detected — do NOT move on. Quote evasive answer and demand concrete reason.'
        : opts.convPhase === 'responsibility'
          ? 'RESPONSIBILITY phase: what did each person do that worsened things — cite transcript.'
          : opts.convPhase === 'repair'
            ? 'REPAIR phase: derive concrete rule/change from recurring themes in transcript — NO generic "what will you change".'
            : opts.activeGap
              ? `GAP exploration: «${opts.activeGap.description}» — cite contradictions between partners.`
              : 'Clarify remaining misunderstandings before responsibility phase.';

  try {
    const raw = await callOpenAIJson(
      apiKey,
      buildBrainSystemPrompt(language),
      JSON.stringify({
        task: 'Evaluate last round (if applicable) AND generate next mediator question.',
        phase: opts.convPhase,
        questionKind: opts.questionKind,
        questionNumber: opts.questionNumber,
        perspectiveA: state.perspectiveA,
        perspectiveB: state.perspectiveB,
        mainConflict: state.mainConflict,
        identifiedGaps: state.identifiedGaps,
        activeGap: opts.activeGap,
        activeGapId: state.activeGapId,
        factMemory: state.factMemory,
        stanceHistory: state.stanceHistory,
        contradictions: state.contradictions,
        reconciliationDetected: state.reconciliationDetected,
        emotionalResolutionDetected: state.emotionalResolutionDetected,
        responsibilityReady: state.responsibilityReady,
        responsibilityComplete: state.responsibilityComplete,
        repairComplete: state.repairComplete,
        lastQuestion,
        partnerALastAnswer: lastAnswers[0] ?? '',
        partnerBLastAnswer: lastAnswers[1] ?? '',
        previousMediatorQuestions: previousQuestions,
        fullTranscript: transcript,
        phaseHint,
      }),
      0.58
    );
    const brain = parseBrainResult(raw);
    if (isUsableMediatorQuestion(brain.question)) {
      return { brain, aiRaw: raw };
    }
  } catch (e) {
    console.error('[live-mediator] runMediatorBrain:', String(e));
  }

  return {
    brain: buildFallbackBrain(state, language, {
      ...opts,
      evasive: evasiveHeuristic,
      lastQuestion,
      lastAnswers,
    }),
  };
}

function resolveParticipantNames(
  body: Record<string, unknown>,
  language: string
): { nameA: string; nameB: string } {
  const hostName = typeof body.hostName === 'string' ? body.hostName.trim() : '';
  const partnerName = typeof body.partnerName === 'string' ? body.partnerName.trim() : '';
  const partnerDisplayName =
    typeof body.partnerDisplayName === 'string' ? body.partnerDisplayName.trim() : '';
  const nameA = hostName || 'Partner A';
  const nameB = partnerName || partnerDisplayName || partnerBDefaultLabel(language);
  return { nameA, nameB };
}

function hasParticipantNames(nameA: string, nameB: string): boolean {
  return (
    nameA !== 'Partner A' &&
    nameB !== 'Partner B' &&
    nameB !== 'Partnerka/Partner B' &&
    nameB !== 'Partenaire B' &&
    nameB !== 'Pareja B'
  );
}

function formatOpeningSummary(
  language: string,
  nameA: string,
  nameB: string,
  perspectiveA: string,
  perspectiveB: string,
  mainConflict: string,
  biggestGap: string
): string {
  return i18nFormatOpeningSummary(
    language,
    nameA,
    nameB,
    perspectiveA,
    perspectiveB,
    mainConflict,
    biggestGap
  );
}

function buildOpeningFirstQuestion(
  language: string,
  nameA: string,
  nameB: string,
  perspectiveA: string,
  perspectiveB: string
): string {
  return i18nBuildOpeningFirstQuestion(
    language,
    nameA,
    nameB,
    perspectiveA,
    perspectiveB,
    hasParticipantNames(nameA, nameB)
  );
}

function shouldBlockDuplicateFirstQuestion(
  state: ConversationState,
  prevQuestionCount: number,
  hadBothAnswers: boolean,
  recentMessages: RecentMessage[] = []
): boolean {
  if (
    state.mainConflictQuestionAsked &&
    state.questionCount >= 1 &&
    prevQuestionCount === 0 &&
    !hadBothAnswers
  ) {
    return true;
  }
  if (state.openingSummaryDone && state.mainConflictQuestionAsked && !hadBothAnswers) {
    const lastQ = extractLastQuestion(recentMessages);
    if (lastQ && (state.currentQuestion?.id === 'gap_facts' || normalizeQuestion(lastQ).includes('wydarzenie'))) {
      return true;
    }
    if ((state.gapExplorationStep ?? 0) >= 1 && prevQuestionCount <= state.questionCount) {
      return true;
    }
  }
  return false;
}

function fallbackGaps(language: string, biggestGap: string): IdentifiedGap[] {
  const fb = openingFallbackTexts(language);
  return [
    {
      id: 'intent_gap',
      description: biggestGap || fb.intentGap,
      resolved: false,
      discussionRounds: 0,
      priority: 70,
    },
    {
      id: 'trust_gap',
      description: fb.trustGap,
      resolved: false,
      discussionRounds: 0,
      priority: 90,
    },
  ];
}

async function generateOpeningSummary(
  body: Record<string, unknown>,
  apiKey: string | undefined
): Promise<LiveMediatorResponse> {
  const language = normalizeLanguage(body.language);
  const recentMessages = (body.recentMessages as RecentMessage[]) ?? [];
  const existingState = normalizeState(body.state);
  if (shouldBlockDuplicateOpening(existingState, recentMessages)) {
    return withFullState({
      source: 'blocked-duplicate-opening',
      state: existingState,
      phase: existingState.questionCount,
      progress: progressFromQuestion(
        existingState.questionCount,
        existingState.sessionQuestionBudget
      ),
    });
  }

  const analysis = (body.analysisSummary as Record<string, unknown>) ?? {};
  const ctx = stringFromAnalysis(analysis, 'situation_summary', 'key_trigger', 'core_conflict');
  const hostDesc = ((body.combinedDescription as string) ?? '').slice(0, 600);
  const partnerDesc = ((body.partnerCombinedDescription as string) ?? '').slice(0, 600);
  const gapFromAnalysis = stringFromAnalysis(
    analysis,
    'perspective_gap_detail',
    'perspective_gap',
    'core_conflict'
  );

  const fb = openingFallbackTexts(language);
  let perspectiveA = hostDesc || ctx || fb.noDescA;
  let perspectiveB = partnerDesc || fb.noDescB;
  let mainConflict = ctx || gapFromAnalysis || fb.mainConflict;
  let biggestGap = gapFromAnalysis || fb.biggestGap;
  let gaps = fallbackGaps(language, biggestGap);

  if (apiKey) {
    try {
      const result = await callOpenAIJson(
        apiKey,
        `You are a tough couple mediator. Return JSON only:
{
  "perspectiveA": "partner A view, no blame",
  "perspectiveB": "partner B view, no blame",
  "mainConflict": "one sentence core conflict",
  "biggestGap": "biggest perception gap in one sentence",
  "identifiedGaps": [{ "id": "snake_case_id", "description": "gap description", "resolved": false, "discussionRounds": 0 }]
}
${openingSummaryOpenAiRules(language)}`,
        JSON.stringify({
          hostDescription: hostDesc,
          partnerDescription: partnerDesc,
          analysisContext: ctx,
        }),
        0.45
      );

      if (typeof result.perspectiveA === 'string') perspectiveA = result.perspectiveA;
      if (typeof result.perspectiveB === 'string') perspectiveB = result.perspectiveB;
      if (typeof result.mainConflict === 'string') mainConflict = result.mainConflict;
      if (typeof result.biggestGap === 'string') biggestGap = result.biggestGap;
      const parsed = normalizeGaps(result.identifiedGaps);
      if (parsed.length > 0) gaps = parsed;
    } catch (e) {
      console.error('[live-mediator] opening_summary error:', String(e));
    }
  }

  if (gaps.length === 0) gaps = fallbackGaps(language, biggestGap);
  gaps = gaps.map((g, i) => ({
    ...g,
    id: g.id || slugGapId(g.description, i),
    resolved: false,
    discussionRounds: g.discussionRounds ?? 0,
    priority: g.priority ?? DEFAULT_GAP_PRIORITY,
  }));

  const primaryGap = gaps[0];
  const sessionQuestionBudget = computeSessionQuestionBudget(
    gaps.length,
    hostDesc,
    partnerDesc
  );
  const { nameA, nameB } = resolveParticipantNames(body, language);
  const publicMessage = formatOpeningSummary(
    language,
    nameA,
    nameB,
    perspectiveA,
    perspectiveB,
    mainConflict,
    biggestGap
  );
  const aiQuestion = buildOpeningFirstQuestion(
    language,
    nameA,
    nameB,
    perspectiveA,
    perspectiveB
  );

  const baseState: ConversationState = {
    phase: 'gap_exploration',
    identifiedGaps: gaps,
    activeGapId: primaryGap?.id ?? null,
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    perspectiveA,
    perspectiveB,
    mainConflict,
    coveredTopics: [],
    lastQuestionSignature: '',
    escalationLevel: 0,
    questionCount: 0,
    responsibilityQuestionsAsked: 0,
    repairQuestionsAsked: 0,
    sessionQuestionBudget,
    midSummaryShown: false,
    responsibilityReady: false,
    responsibilityComplete: false,
    repairComplete: false,
    midSummaryEligible: false,
    conversationFinished: false,
    singleSidedRounds: 0,
    evasionStreak: 0,
    factMemory: [],
    stanceHistory: [],
    contradictions: [],
  };

  const questionNumber = 1;
  const state = updateStateAfterQuestion(
    baseState,
    stripQuestionPrefix(aiQuestion),
    questionNumber,
    primaryGap?.id ?? null,
    'conflict',
    'gap_facts'
  );

  return withFullState({
    publicMessage,
    aiQuestion,
    summaryType: 'opening',
    state,
    phase: questionNumber,
    progress: progressFromQuestion(questionNumber, sessionQuestionBudget),
    nextQuestionIndex: questionNumber,
    source: apiKey ? 'brain-opening' : 'fallback-opening',
  });
}

async function generateQuestion(
  body: Record<string, unknown>,
  apiKey: string | undefined
): Promise<LiveMediatorResponse> {
  const language = normalizeLanguage(body.language);
  const questionNumber = ((body.questionNumber as number) ?? 0) + 1;
  const prevQuestionCount = (body.questionNumber as number) ?? 0;
  const recentMessages = (body.recentMessages as RecentMessage[]) ?? [];
  const hostUserId = typeof body.userId === 'string' ? body.userId : '';

  let state = normalizeState(body.state);
  state = applyPostAnswerStateAdvance(state, body);

  if (isReadyForProposedSolution(state) || state.conversationFinished) {
    return generateSummary('proposed_solution', { ...body, state }, apiKey);
  }

  if (!state.openingSummaryDone) {
    return withFullState({
      source: 'blocked-no-summary',
      state,
      phase: 0,
      progress: 5,
    });
  }

  const budget = state.sessionQuestionBudget;
  const partnerUserId =
    typeof body.partnerUserId === 'string' ? body.partnerUserId : '';
  const lastAnswerRound = extractAnswersForQuestion(
    recentMessages,
    state.currentQuestion?.id,
    hostUserId,
    partnerUserId ? [partnerUserId] : []
  );
  const lastAnswers = lastAnswerRound.answers;
  const hadBothAnswersEarly =
    lastAnswers.length >= 2 && prevQuestionCount > 0;
  if (shouldBlockDuplicateFirstQuestion(state, prevQuestionCount, hadBothAnswersEarly, recentMessages)) {
    return withFullState({
      source: 'blocked-first-question-already-asked',
      state,
      phase: state.questionCount,
      progress: progressFromQuestion(state.questionCount, budget),
    });
  }

  const roundByPartner = {
    partnerAAnswer: lastAnswerRound.partnerAAnswer,
    partnerBAnswer: lastAnswerRound.partnerBAnswer,
    count: lastAnswerRound.count,
  };
  const hadBothAnswers = lastAnswers.length >= 2 && prevQuestionCount > 0;
  const hadOneAnswer = roundByPartner.count === 1 && prevQuestionCount > 0;
  const reconciliationSignals = detectReconciliationSignals(recentMessages, state, language);

  if (hadBothAnswers) {
    state = { ...state, singleSidedRounds: 0 };
  }

  if (reconciliationSignals.detected || state.reconciliationDetected) {
    state = applyReconciliationClosure(state, recentMessages, hostUserId, language);
  }

  if (isReadyForProposedSolution(state) || (state.repairStep ?? 0) >= REPAIR_STEPS_COUNT) {
    return generateSummary('proposed_solution', { ...body, state }, apiKey);
  }

  if (isReadyForFinalSummary(state)) {
    return generateSummary('final_summary', { ...body, state }, apiKey);
  }

  const { nameA, nameB } = resolveParticipantNames(body, language);

  const inRepairFlow =
    canEnterRepair(state) ||
    (state.reconciliationRepairOffered && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT);

  if (inRepairFlow && hadBothAnswers && state.currentQuestion?.phase === 'repair') {
    let repairStep = state.repairStep ?? 0;
    if (repairStep < REPAIR_STEPS_COUNT) {
      let repairQ = buildRepairStepQuestion(repairStep, language, nameA, nameB);
      while (
        wouldRepeatQuestion(state, repairQ.topicId, repairQ.text, recentMessages) &&
        repairStep < REPAIR_STEPS_COUNT - 1
      ) {
        repairStep++;
        repairQ = buildRepairStepQuestion(repairStep, language, nameA, nameB);
      }
      if (wouldRepeatQuestion(state, repairQ.topicId, repairQ.text, recentMessages)) {
        repairStep++;
        if (repairStep >= REPAIR_STEPS_COUNT) {
          return generateSummary('proposed_solution', { ...body, state }, apiKey);
        }
        repairQ = buildRepairStepQuestion(repairStep, language, nameA, nameB);
      }
      const prefix = obojePrefix(language);
      const updatedState = finalizeConversationIfReady(
        updateStateAfterQuestion(
          { ...state, repairStep },
          repairQ.text,
          questionNumber,
          null,
          'repair',
          repairQ.topicId
        )
      );
      return withFullState({
        aiQuestion: `🎯 ${prefix}: ${repairQ.text}`,
        state: updatedState,
        phase: questionNumber,
        progress: progressFromQuestion(questionNumber, budget),
        nextQuestionIndex: questionNumber,
        source: 'repair-step',
      });
    }
  }

  if (
    (reconciliationSignals.detected || state.reconciliationDetected) &&
    !hasRecentAggression(recentMessages) &&
    !state.reconciliationRepairOffered &&
    isGapExplorationComplete(state) &&
    unresolvedGaps(state).length === 0
  ) {
    const transition = buildReconciliationTransitionMessage(language);
    const repairQ = buildRepairStepQuestion(0, language, nameA, nameB);
    const repairQuestionFull = buildReconciliationRepairQuestion(language, nameA, nameB);
    const updatedState = finalizeConversationIfReady(
      updateStateAfterQuestion(
        {
          ...state,
          reconciliationRepairOffered: true,
          repairStep: 0,
          phase: 'repair',
          responsibilityReady: true,
          responsibilityComplete: true,
        },
        repairQ.text,
        questionNumber,
        null,
        'repair',
        'repair_rule'
      )
    );
    return withFullState({
      publicMessage: transition,
      aiQuestion: repairQuestionFull,
      state: updatedState,
      phase: questionNumber,
      progress: progressFromQuestion(questionNumber, budget),
      nextQuestionIndex: questionNumber,
      source: 'reconciliation-repair',
    });
  }

  if (hadOneAnswer && !hadBothAnswers) {
    state = { ...state, singleSidedRounds: state.singleSidedRounds + 1 };
  } else if (hadBothAnswers) {
    state = { ...state, singleSidedRounds: 0 };
  }

  if (state.singleSidedRounds >= SINGLE_SIDED_ROUNDS_MAX && prevQuestionCount > 0) {
    const prompt = singleSidedPartnerPrompt(language);
    const updatedState = finalizeConversationIfReady(
      updateStateAfterQuestion(state, prompt, questionNumber, state.activeGapId, 'deepen')
    );
    const prefix = obojePrefix(language);
    return withFullState({
      aiQuestion: `🎯 ${prefix}: ${prompt}`,
      state: updatedState,
      phase: questionNumber,
      progress: progressFromQuestion(questionNumber, budget),
      nextQuestionIndex: questionNumber,
      source: 'single-sided-prompt',
    });
  }

  if (!state.mainConflictQuestionAsked && prevQuestionCount > 0) {
    state = { ...state, mainConflictQuestionAsked: true };
  }

  if (!isGapExplorationComplete(state)) {
    let openGapEarly = state.activeGapId ? getGapById(state, state.activeGapId) : null;
    if (!openGapEarly || openGapEarly.resolved || openGapEarly.resolvedByMutualUnderstanding) {
      openGapEarly = selectNextGap(state);
      if (openGapEarly) state = { ...state, activeGapId: openGapEarly.id };
    }
    let gapQ = buildGapExplorationStepQuestion(
      state.gapExplorationStep ?? 0,
      language,
      openGapEarly,
      nameA,
      nameB
    );
    let step = state.gapExplorationStep ?? 0;
    while (
      wouldRepeatQuestion(state, gapQ.topicId, gapQ.text, recentMessages) &&
      step < MIN_GAP_EXPLORATION_STEPS - 1
    ) {
      step++;
      gapQ = buildGapExplorationStepQuestion(step, language, openGapEarly, nameA, nameB);
    }
    const prefix = obojePrefix(language);
    const updatedState = finalizeConversationIfReady(
      updateStateAfterQuestion(
        { ...state, gapExplorationStep: step },
        gapQ.text,
        questionNumber,
        openGapEarly?.id ?? null,
        'gap',
        gapQ.topicId
      )
    );
    return withFullState({
      aiQuestion: `🎯 ${prefix}: ${gapQ.text}`,
      state: updatedState,
      phase: questionNumber,
      progress: progressFromQuestion(questionNumber, budget),
      nextQuestionIndex: questionNumber,
      source: 'gap-exploration-step',
    });
  }

  let openGap = state.activeGapId ? getGapById(state, state.activeGapId) : null;
  if (!openGap || openGap.resolved || openGap.resolvedByMutualUnderstanding) {
    openGap = selectNextGap(state);
    if (openGap) state = { ...state, activeGapId: openGap.id };
  }

  let convPhase = resolveConversationPhase(state);
  state.phase = convPhase;

  let questionKind: QuestionKind;
  let targetGapId: string | null = null;

  if (!state.mainConflictQuestionAsked) {
    questionKind = 'conflict';
  } else if (openGap) {
    questionKind = 'gap';
    targetGapId = openGap.id;
  } else if (canEnterRepair(state) && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT) {
    questionKind = 'repair';
  } else if (
    state.responsibilityReady &&
    canEnterResponsibility(state) &&
    (state.responsibilityQuestionsAsked < MIN_RESPONSIBILITY_QUESTIONS ||
      !state.responsibilityComplete)
  ) {
    questionKind = 'responsibility';
  } else if (
    state.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS &&
    state.responsibilityComplete &&
    !state.repairComplete &&
    (state.repairStep ?? 0) < REPAIR_STEPS_COUNT
  ) {
    questionKind = 'repair';
  } else if (!canEnterResponsibility(state)) {
    questionKind = 'gap';
  } else {
    state = finalizeConversationIfReady(state);
    if (isReadyForProposedSolution(state) || (state.repairStep ?? 0) >= REPAIR_STEPS_COUNT) {
      return generateSummary('proposed_solution', { ...body, state }, apiKey);
    }
    if (isReadyForFinalSummary(state)) {
      return generateSummary('final_summary', { ...body, state }, apiKey);
    }
    if (inRepairFlow && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT) {
      const repairQ = buildRepairStepQuestion(state.repairStep ?? 0, language, nameA, nameB);
      const prefix = obojePrefix(language);
      const updatedState = finalizeConversationIfReady(
        updateStateAfterQuestion(
          state,
          repairQ.text,
          questionNumber,
          null,
          'repair',
          repairQ.topicId
        )
      );
      return withFullState({
        aiQuestion: `🎯 ${prefix}: ${repairQ.text}`,
        state: updatedState,
        phase: questionNumber,
        progress: progressFromQuestion(questionNumber, budget),
        nextQuestionIndex: questionNumber,
        source: 'repair-step-fallback',
      });
    }
    return generateSummary('proposed_solution', { ...body, state }, apiKey);
  }

  const deepenAllowed =
    !state.reconciliationDetected &&
    !state.emotionalResolutionDetected &&
    brainWillDeepen(hadBothAnswers, lastAnswers, extractLastQuestion(recentMessages), language);

  const { brain, aiRaw } = await runMediatorBrain(apiKey, state, recentMessages, language, body, {
    questionKind: deepenAllowed ? 'deepen' : questionKind,
    activeGap: openGap,
    convPhase,
    questionNumber,
  });

  let effectiveKind: QuestionKind =
    brain.evasionDetected &&
    questionKind !== 'conflict' &&
    !state.reconciliationDetected &&
    !state.emotionalResolutionDetected
      ? 'deepen'
      : questionKind;

  if (hadBothAnswers) {
    state = applyBrainEvaluation(state, brain, hadBothAnswers, {
      partnerAAnswer: roundByPartner.partnerAAnswer,
      partnerBAnswer: roundByPartner.partnerBAnswer,
      questionIndex: prevQuestionCount,
      hasOpenAi: !!apiKey,
      language,
      recentMessages,
      hostUserId,
    });
    const showDeadlockMessage = state.showEvasionDeadlockMessage === true;
    if (showDeadlockMessage) {
      state = { ...state, showEvasionDeadlockMessage: false };
    }
    if (aiRaw) {
      state = validateAndMergeAiExtras(state, aiRaw, brain);
      state = finalizeConversationIfReady(state);
    }
    if (isReadyForProposedSolution(state)) {
      return generateSummary('proposed_solution', { ...body, state }, apiKey);
    }
    if (isReadyForFinalSummary(state)) {
      return generateSummary('final_summary', { ...body, state }, apiKey);
    }
    openGap = state.activeGapId ? getGapById(state, state.activeGapId) : null;
    if (!openGap || openGap.resolved || openGap.resolvedByMutualUnderstanding) {
      openGap = selectNextGap(state);
      if (openGap) state = { ...state, activeGapId: openGap.id };
    }
    convPhase = resolveConversationPhase(state);
    state.phase = convPhase;

    if (!state.mainConflictQuestionAsked) {
      effectiveKind = 'conflict';
    } else if (openGap) {
      effectiveKind =
        showDeadlockMessage ||
        (brain.evasionDetected &&
          !state.reconciliationDetected &&
          !state.emotionalResolutionDetected)
          ? 'deepen'
          : 'gap';
      targetGapId = openGap.id;
    } else if (
      state.responsibilityReady &&
      (state.responsibilityQuestionsAsked < MIN_RESPONSIBILITY_QUESTIONS ||
        !state.responsibilityComplete)
    ) {
      effectiveKind = showDeadlockMessage || brain.evasionDetected ? 'deepen' : 'responsibility';
    } else if (
      state.responsibilityQuestionsAsked >= MIN_RESPONSIBILITY_QUESTIONS &&
      state.responsibilityComplete &&
      !state.repairComplete
    ) {
      effectiveKind = showDeadlockMessage || brain.evasionDetected ? 'deepen' : 'repair';
    }

    if (showDeadlockMessage) {
      const prefix = obojePrefix(language);
      const deadlockText = evasionDeadlockPrompt(language);
      const updatedState = updateStateAfterQuestion(
        state,
        deadlockText,
        questionNumber,
        targetGapId ?? openGap?.id ?? null,
        'gap'
      );
      return withFullState({
        aiQuestion: `🎯 ${prefix}: ${deadlockText}`,
        state: finalizeConversationIfReady(updatedState),
        phase: questionNumber,
        progress: progressFromQuestion(questionNumber, budget),
        nextQuestionIndex: questionNumber,
        source: 'evasion-deadlock',
      });
    }
  }

  const escalation = detectEscalationScore((body.lastMessage as string) || '');
  state.escalationLevel += escalation;

  let rawQuestion = brain.question;
  if (!isUsableMediatorQuestion(rawQuestion)) {
    const fb = buildFallbackBrain(state, language, {
      questionKind: effectiveKind,
      activeGap: openGap,
      evasive:
        brain.evasionDetected &&
        !state.reconciliationDetected &&
        !state.emotionalResolutionDetected,
      lastQuestion: extractLastQuestion(recentMessages),
      lastAnswers,
      convPhase: state.phase,
    });
    rawQuestion = fb.question;
  }

  if (
    (state.reconciliationDetected || state.emotionalResolutionDetected) &&
    !hasRecentAggression(recentMessages) &&
    canEnterRepair(state)
  ) {
    if (isHardPressingQuestion(rawQuestion, language)) {
      const gapFallback = buildBothPartnersGapFallback(state, language, openGap, nameA, nameB);
      rawQuestion = canEnterRepair(state)
        ? buildRepairStepQuestion(state.repairStep ?? 0, language, nameA, nameB).text
        : gapFallback.text;
      effectiveKind = canEnterRepair(state) ? 'repair' : 'gap';
    }
  }

  const latestContradiction = state.contradictions.at(-1);
  if (
    latestContradiction &&
    latestContradiction.severity >= 60 &&
    !brain.evasionDetected &&
    effectiveKind === 'gap' &&
    !state.reconciliationDetected
  ) {
    rawQuestion = buildContradictionQuestion(
      latestContradiction.speaker,
      latestContradiction.previousClaim,
      latestContradiction.newClaim,
      language
    );
  }

  rawQuestion = enforceShortQuestion(rawQuestion);

  if (
    !shouldAllowSingleTargetQuestion(
      rawQuestion,
      state,
      recentMessages,
      hostUserId,
      language,
      nameA,
      nameB,
      brain
    )
  ) {
    if (canEnterRepair(state) && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT) {
      const repairQ = buildRepairStepQuestion(state.repairStep ?? 0, language, nameA, nameB);
      rawQuestion = repairQ.text;
      effectiveKind = 'repair';
    } else {
      const gapFallback = buildBothPartnersGapFallback(state, language, openGap, nameA, nameB);
      rawQuestion = gapFallback.text;
      effectiveKind = 'gap';
    }
  }

  let topicId: string =
    effectiveKind === 'repair'
      ? REPAIR_STEP_TOPICS[Math.min(state.repairStep ?? 0, REPAIR_STEP_TOPICS.length - 1)]
      : GAP_STEP_TOPICS[Math.min(state.gapExplorationStep ?? 0, GAP_STEP_TOPICS.length - 1)];

  if (wouldRepeatQuestion(state, topicId, rawQuestion, recentMessages)) {
    if (effectiveKind === 'repair' && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT - 1) {
      const nextStep = (state.repairStep ?? 0) + 1;
      const repairQ = buildRepairStepQuestion(nextStep, language, nameA, nameB);
      rawQuestion = repairQ.text;
      topicId = repairQ.topicId;
      state = { ...state, repairStep: nextStep };
    } else if (!isGapExplorationComplete(state)) {
      const nextStep = Math.min(
        MIN_GAP_EXPLORATION_STEPS - 1,
        (state.gapExplorationStep ?? 0) + 1
      );
      const gapQ = buildGapExplorationStepQuestion(nextStep, language, openGap, nameA, nameB);
      rawQuestion = gapQ.text;
      topicId = gapQ.topicId;
      effectiveKind = 'gap';
    }
  }

  if (questionContainsQuotedGapTitle(rawQuestion)) {
    rawQuestion = rawQuestion.replace(/[«»"“”]/g, '');
  }

  const lastAiQ = extractLastQuestion(recentMessages);
  if (lastAiQ && normalizeQuestion(rawQuestion) === normalizeQuestion(lastAiQ)) {
    if (effectiveKind === 'repair' && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT - 1) {
      const nextStep = (state.repairStep ?? 0) + 1;
      const repairQ = buildRepairStepQuestion(nextStep, language, nameA, nameB);
      rawQuestion = repairQ.text;
      topicId = repairQ.topicId;
      state = { ...state, repairStep: nextStep };
    } else if (!isGapExplorationComplete(state)) {
      const nextStep = Math.min(
        MIN_GAP_EXPLORATION_STEPS - 1,
        (state.gapExplorationStep ?? 0) + 1
      );
      const gapQ = buildGapExplorationStepQuestion(nextStep, language, openGap, nameA, nameB);
      rawQuestion = gapQ.text;
      topicId = gapQ.topicId;
      effectiveKind = 'gap';
      state = { ...state, gapExplorationStep: nextStep };
    }
  }

  const prefix = obojePrefix(language);
  const aiQuestion = `🎯 ${prefix}: ${rawQuestion}`;
  let updatedState = updateStateAfterQuestion(
    state,
    rawQuestion,
    questionNumber,
    targetGapId ?? openGap?.id ?? null,
    effectiveKind,
    topicId
  );

  if (!state.mainConflictQuestionAsked) {
    updatedState.mainConflictQuestionAsked = true;
    updatedState.phase = 'gap_exploration';
  }

  updatedState = finalizeConversationIfReady(updatedState);

  return withFullState({
    aiQuestion,
    state: updatedState,
    phase: questionNumber,
    progress: progressFromQuestion(questionNumber, budget),
    nextQuestionIndex: questionNumber,
    escalationDetected: state.escalationLevel >= 3,
    escalationMessage:
      state.escalationLevel >= 3 ? escalationRisingMessage(language) : undefined,
    source: apiKey ? 'brain-mediator' : 'brain-fallback',
  });
}

function brainWillDeepen(
  hadBothAnswers: boolean,
  lastAnswers: string[],
  lastQuestion: string,
  language: string
): boolean {
  if (!hadBothAnswers) return false;
  return detectEvasiveAnswers(lastAnswers, lastQuestion, language);
}

function enforceShortQuestion(q: string): string {
  const sentences = q.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return q.trim();
  return sentences.slice(0, 2).join(' ').trim();
}

function answerAckFallback(body: Record<string, unknown>): LiveMediatorResponse {
  const language = normalizeLanguage(body.language);
  const recent = (body.recentMessages as RecentMessage[]) ?? [];
  const prevQuestionCount = (body.questionNumber as number) ?? 0;
  const hadBothAnswers =
    extractLastRoundAnswers(recent).length >= 2 && prevQuestionCount > 0;
  const state = applyPostAnswerStateAdvance(normalizeState(body.state), body);
  const ctx = extractAnswerAckContext(body, state);
  const hostUserId = typeof body.userId === 'string' ? body.userId : '';
  const hostName = typeof body.hostName === 'string' ? body.hostName.trim() : '';
  const partnerName = typeof body.partnerName === 'string' ? body.partnerName.trim() : '';

  if (
    state.repairComplete ||
    state.conversationFinished ||
    isReadyForProposedSolution(state) ||
    shouldCompleteRepairFromTranscript(state, hadBothAnswers, recent)
  ) {
    return withFullState({
      ...buildRepairClosureHints(language),
      state,
      source: 'repair-closure-ack',
    });
  }

  const reconciliation = detectReconciliationSignals(recent, state, language);
  const reconciled = reconciliation.detected || state.reconciliationDetected;

  if (reconciled) {
    const hints = buildReconciliationPrivateHints(
      language,
      hostName,
      partnerName,
      ctx.partnerAAnswer,
      ctx.partnerBAnswer
    );
    const nextState = applyReconciliationClosure(state, recent, hostUserId, language);
    return withFullState({
      ...hints,
      state: nextState,
      source: 'reconciliation-ack',
    });
  }

  const ack = answerAckTexts(language);
  const last = ctx.partnerBAnswer || ctx.partnerAAnswer || '';
  const quote = last.slice(0, 48) || ack.yourAnswer;
  const escalated = detectEscalationScore(last) > 0;

  const gapHint = ctx.activeGap ? ack.stayOnGap(ctx.activeGap) : '';
  const questionHint = ctx.activeQuestion ? ack.questionWas(ctx.activeQuestion.slice(0, 60)) : '';

  return withFullState({
    privateHint: {
      tone: escalated
        ? `«${quote}» — ${ack.attack} ${gapHint} ${questionHint}`
        : `«${quote}» — ${ack.vague} ${gapHint} ${questionHint}`,
    },
    partnerPrivateHint: {
      tone: `${ack.partnerAnswered} ${gapHint}`,
    },
    escalationDetected: escalated,
    escalationMessage: escalated ? escalationDetectedMessage(language) : undefined,
    state,
    source: 'fallback',
  });
}

async function generateSummary(
  mode: 'mid_summary' | 'final_summary' | 'extension_check' | 'proposed_solution',
  body: Record<string, unknown>,
  apiKey: string | undefined
): Promise<LiveMediatorResponse> {
  const language = normalizeLanguage(body.language);
  const questionNumber = (body.questionNumber as number) ?? 0;
  let state = finalizeConversationIfReady(normalizeState(body.state));

  if (mode === 'mid_summary') {
    if (!isReadyForMidSummary(state)) {
      return withFullState({
        source: 'blocked-mid-unresolved-gaps',
        state,
        phase: questionNumber,
        progress: progressFromQuestion(questionNumber, state.sessionQuestionBudget),
      });
    }
    state = { ...state, midSummaryShown: true };
  }

  if (mode === 'final_summary' && !isReadyForFinalSummary(state)) {
    return withFullState({
      source: 'blocked-final-not-ready',
      state,
      phase: questionNumber,
      progress: progressFromQuestion(questionNumber, state.sessionQuestionBudget),
    });
  }

  const hostUserId = typeof body.userId === 'string' ? body.userId : '';
  const recent = (body.recentMessages as RecentMessage[]) ?? [];

  if (mode === 'proposed_solution') {
    const { nameA, nameB } = resolveParticipantNames(body, language);
    const round = extractRoundAnswersByPartner(recent, hostUserId);
    if (
      isReadyForProposedSolution(state) &&
      (!state.finalCommitments?.partnerA || !state.finalCommitments?.partnerB) &&
      (round.partnerAAnswer || round.partnerBAnswer)
    ) {
      state = completeRepairFlow(
        state,
        round.partnerAAnswer,
        round.partnerBAnswer,
        language
      );
    } else if (isReadyForProposedSolution(state) && !state.finalCommitments) {
      state = completeRepairFlow(
        state,
        round.partnerAAnswer,
        round.partnerBAnswer,
        language
      );
    }
    return withFullState({
      publicMessage: formatProposedSolutionMessage(state, language, nameA, nameB),
      summaryType: 'proposed_solution',
      phase: questionNumber,
      progress: 100,
      state,
      source: 'repair-proposal',
    });
  }

  const transcript = buildRichTranscript(recent, hostUserId);
  const analysis = (body.analysisSummary as Record<string, unknown>) ?? {};
  const ctx = stringFromAnalysis(analysis, 'situation_summary', 'key_trigger');
  const hostDesc = ((body.combinedDescription as string) ?? '').slice(0, 500);
  const partnerDesc = ((body.partnerCombinedDescription as string) ?? '').slice(0, 500);
  const unresolved = unresolvedGaps(state);

  const kindMap: Record<string, 'mid' | 'final' | 'extension_check' | 'proposed_solution'> = {
    mid_summary: 'mid',
    final_summary: 'final',
    extension_check: 'extension_check',
    proposed_solution: 'proposed_solution',
  };

  const gapSection =
    unresolved.length > 0
      ? `\n${unresolvedGapsLabel(language)} ${unresolved.map((g) => g.description).join('; ')}`
      : '';

  const sectionPrompts = summarySectionPrompts(language, gapSection);

  if (apiKey) {
    try {
      const result = await callOpenAIJson(
        apiKey,
        `You are a tough couple mediator. Write publicMessage only. Reference specific quotes from transcript. Language: ${openAiLanguageLabel(language)}. ${sectionPrompts[mode]}

${openAiLanguageDirective(language)}`,
        JSON.stringify({
          disputeContext: ctx,
          hostDescription: hostDesc,
          partnerDescription: partnerDesc,
          conversationPhase: state.phase,
          identifiedGaps: state.identifiedGaps,
          fullTranscript: transcript,
          previousQuestions: extractAllMediatorQuestions(recent),
        }),
        0.5
      );
      const publicMessage =
        typeof result.publicMessage === 'string' ? result.publicMessage : undefined;
      if (publicMessage) {
        return withFullState({
          publicMessage,
          summaryType: kindMap[mode],
          phase: questionNumber,
          progress:
            kindMap[mode] === 'final' || kindMap[mode] === 'proposed_solution'
              ? 100
              : progressFromQuestion(questionNumber, state.sessionQuestionBudget),
          state,
          source: 'openai-summary',
        });
      }
    } catch (e) {
      console.error('[live-mediator] summary error:', String(e));
    }
  }

  const fbFallback = summaryFallbackTexts(language, ctx, gapSection);
  const fb: Record<string, string> = {
    ...fbFallback,
    final_summary: formatFinalSummaryFallback(state, ctx, language),
  };

  return withFullState({
    publicMessage: fb[mode],
    summaryType: kindMap[mode],
    phase: questionNumber,
    progress:
      kindMap[mode] === 'final' || kindMap[mode] === 'proposed_solution'
        ? 100
        : progressFromQuestion(questionNumber, state.sessionQuestionBudget),
    state,
    source: 'fallback-summary',
  });
}

if (import.meta.main) {
  serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody: Record<string, unknown> | null = null;

  try {
    requestBody = await req.json();
    const body: Record<string, unknown> = requestBody ?? {};
    const mode = (body.mode as MediatorMode) ?? 'generate_question';
    const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();

    if (body.diagnostics === true) {
      return new Response(
        JSON.stringify({
          openaiConfigured: !!apiKey,
          version: '3.3-conversation-driven',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: LiveMediatorResponse;
    const advancedState = applyPostAnswerStateAdvance(
      finalizeConversationIfReady(normalizeState(body.state)),
      body
    );
    const enrichedBody = { ...body, state: advancedState };

    if (mode === 'opening_summary') {
      result = await generateOpeningSummary(body, apiKey);
    } else if (mode === 'generate_question') {
      if (isReadyForProposedSolution(advancedState) || advancedState.conversationFinished) {
        result = await generateSummary('proposed_solution', enrichedBody, apiKey);
      } else if (isReadyForFinalSummary(advancedState)) {
        result = await generateSummary('final_summary', enrichedBody, apiKey);
      } else if (isReadyForMidSummary(advancedState)) {
        result = await generateSummary('mid_summary', enrichedBody, apiKey);
      } else {
        result = await generateQuestion(enrichedBody, apiKey);
      }
    } else if (mode === 'answer_ack') {
      if (apiKey) {
        try {
          const ackState = normalizeState(body.state);
          const ackCtx = extractAnswerAckContext(body, ackState);
          const ack = await callOpenAIJson(
            apiKey,
            `MODE answer_ack. Both partners answered. NO publicMessage, NO aiQuestion.
Return JSON: { "privateHint": { "tone": "..." }, "partnerPrivateHint": { "tone": "..." } }
Quote EXACT words from answers. Detect evasion, contradictions, version changes.
Reference active question and gap. Tough love, min 50 chars each.
Language: ${openAiLanguageLabel(normalizeLanguage(body.language))}.

${openAiLanguageDirective(normalizeLanguage(body.language))}`,
            JSON.stringify({
              activeQuestion: ackCtx.activeQuestion,
              activeGap: ackCtx.activeGap,
              partnerAAnswer: ackCtx.partnerAAnswer,
              partnerBAnswer: ackCtx.partnerBAnswer,
              fullTranscript: ackCtx.transcript,
              previousQuestions: ackCtx.previousQuestions,
            }),
            0.5
          );
          result = withFullState({
            privateHint: ack.privateHint as LiveMediatorResponse['privateHint'],
            partnerPrivateHint: ack.partnerPrivateHint as LiveMediatorResponse['partnerPrivateHint'],
            state: ackState,
            source: 'openai-ack',
          });
        } catch {
          result = answerAckFallback(body);
        }
      } else {
        result = answerAckFallback(body);
      }
    } else if (
      mode === 'mid_summary' ||
      mode === 'final_summary' ||
      mode === 'extension_check' ||
      mode === 'proposed_solution'
    ) {
      result = await generateSummary(mode, enrichedBody, apiKey);
    } else {
      result = withFullState({ source: 'unknown-mode', state: advancedState });
    }

    console.log(`[live-mediator v3.3] mode=${mode} source=${result.source}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[live-mediator] fatal:', String(error));
    const safeState = requestBody?.state
      ? normalizeState(requestBody.state)
      : _defaultState();
    return new Response(
      JSON.stringify({
        error: String(error),
        source: 'error',
        state: safeState,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  });
}

// --- Test exports (used by scenario_test.ts) ---
export { normalizeLanguage, localized, LANGUAGE_NAMES } from './i18n.ts';
export {
  advanceAfterBothAnswered,
  applyPostAnswerStateAdvance,
  applyReconciliationClosure,
  applyBrainEvaluation,
  buildConflictQuestion,
  buildFallbackBrain,
  buildGapExplorationStepQuestion,
  buildGenericRepairBothQuestion,
  buildOpeningFirstQuestion,
  buildReconciliationPrivateHints,
  buildReconciliationRepairQuestion,
  buildReconciliationTransitionMessage,
  buildRepairClosureHints,
  buildRepairStepQuestion,
  buildRichTranscript,
  canEnterRepair,
  completeRepairFlow,
  computeSessionQuestionBudget,
  containsConcreteSignal,
  detectEvasiveAnswers,
  detectReconciliationSignals,
  detectStanceChanges,
  discoverNewGaps,
  enforceShortQuestion,
  evasionDeadlockPrompt,
  extractAnswersForQuestion,
  extractCommitmentFromAnswer,
  extractFinalCommitments,
  fallbackGapQuestion,
  finalizeConversationIfReady,
  formatFinalSummaryFallback,
  formatOpeningSummary,
  formatProposedSolutionMessage,
  generateOpeningSummary,
  heuristicEvasion,
  humanizeGapDescription,
  isAnswerEvasive,
  isGapExplorationComplete,
  isPureDeflection,
  isReadyForFinalSummary,
  isReadyForMidSummary,
  isReadyForProposedSolution,
  isRepairStressTestQuestion,
  isUsableMediatorQuestion,
  isHardPressingQuestion,
  isReconciliationMessage,
  isSingleTargetedQuestion,
  markGapDeadlockedAndAdvance,
  markGapResolvedByMutualUnderstanding,
  mergeNewGaps,
  normalizeQuestion,
  normalizeState,
  parseBrainResult,
  questionContainsQuotedGapTitle,
  recordFactsFromAnswers,
  resolveConversationPhase,
  resolveParticipantNames,
  selectNextGap,
  shouldBlockDuplicateFirstQuestion,
  shouldBlockDuplicateOpening,
  shouldAllowSingleTargetQuestion,
  shouldCompleteRepairFromTranscript,
  shouldResolveGap,
  singleSidedPartnerPrompt,
  buildBrainSystemPrompt,
  wouldRepeatQuestion,
  truncateSafeSentence,
  type ConversationState,
  type FinalCommitments,
  type IdentifiedGap,
  type MediatorBrainResult,
  MIN_GAP_EXPLORATION_STEPS,
  REPAIR_STEPS_COUNT,
};
