/**
 * Scenario tests for Live Mediator v3.5 logic (no OpenAI required).
 */
import {
  advanceAfterBothAnswered,
  applyBrainEvaluation,
  applyPostAnswerStateAdvance,
  applyReconciliationClosure,
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
  buildBrainSystemPrompt,
  canEnterRepair,
  completeRepairFlow,
  computeSessionQuestionBudget,
  containsConcreteSignal,
  detectEvasiveAnswers,
  detectReconciliationSignals,
  detectStanceChanges,
  enforceShortQuestion,
  extractAnswersForQuestion,
  extractCommitmentFromAnswer,
  extractFinalCommitments,
  fallbackGapQuestion,
  finalizeConversationIfReady,
  formatFinalSummaryFallback,
  formatOpeningSummary,
  formatProposedSolutionMessage,
  generateOpeningSummary,
  humanizeGapDescription,
  isAnswerEvasive,
  isGapExplorationComplete,
  isHardPressingQuestion,
  isPureDeflection,
  isReadyForFinalSummary,
  isReadyForMidSummary,
  isReadyForProposedSolution,
  isReconciliationMessage,
  isRepairStressTestQuestion,
  isSingleTargetedQuestion,
  isUsableMediatorQuestion,
  markGapResolvedByMutualUnderstanding,
  mergeNewGaps,
  MIN_GAP_EXPLORATION_STEPS,
  normalizeQuestion,
  normalizeState,
  normalizeLanguage,
  parseBrainResult,
  questionContainsQuotedGapTitle,
  recordFactsFromAnswers,
  REPAIR_STEPS_COUNT,
  resolveConversationPhase,
  resolveParticipantNames,
  selectNextGap,
  shouldAllowSingleTargetQuestion,
  shouldBlockDuplicateFirstQuestion,
  shouldBlockDuplicateOpening,
  shouldCompleteRepairFromTranscript,
  shouldResolveGap,
  singleSidedPartnerPrompt,
  truncateSafeSentence,
  wouldRepeatQuestion,
  type ConversationState,
  type MediatorBrainResult,
} from './index.ts';

import { assert, assertEquals, assertFalse, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const LIVE_PHASE_OPENING_END = 5;
const LIVE_PHASE_DEEPENING_END = 10;
const MIN_RESPONSIBILITY_QUESTIONS = 4;
const MIN_REPAIR_QUESTIONS = 3;

type LiveQuestionPhase = 'opening' | 'deepening' | 'resolution' | 'extension';

/** Mirrors services/liveMediation.ts getQuestionPhase for Deno tests */
function clientGetQuestionPhase(
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

/** Mirrors services/liveMediation.ts getMediatorPhaseLabel for Deno tests */
function clientGetMediatorPhaseLabel(
  state: ConversationState | null | undefined,
  lang: 'pl' | 'en' = 'pl'
): string | null {
  if (!state) return null;
  if (!state.openingSummaryDone) return lang === 'en' ? 'Summary' : 'Podsumowanie';
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
  if (state.conversationFinished) {
    return lang === 'en' ? 'Final summary' : 'Podsumowanie końcowe';
  }
  return lang === 'en' ? 'Wrap-up' : 'Domykanie';
}

const HOST = 'host-uuid';
const PARTNER = 'partner-uuid';

function baseState(): ConversationState {
  return normalizeState({
    phase: 'gap_exploration',
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    perspectiveA: 'Czuję się ignorowany.',
    perspectiveB: 'To nieprawda.',
    mainConflict: 'Różne odczucia co do uwagi',
    identifiedGaps: [
      {
        id: 'attention_gap',
        description: 'Czy partner A jest ignorowany',
        resolved: false,
        discussionRounds: 0,
        priority: 50,
      },
    ],
    activeGapId: 'attention_gap',
    sessionQuestionBudget: 12,
  });
}

function completeBrain(overrides: Partial<MediatorBrainResult> = {}): MediatorBrainResult {
  return {
    partnerAAnswered: true,
    partnerBAnswered: true,
    evasionDetected: false,
    evasionReason: '',
    activeGapResolved: false,
    gapResolveConfidence: 0,
    gapResolveReason: '',
    newGapDetected: false,
    newGap: null,
    readyForResponsibility: false,
    responsibilityComplete: false,
    repairComplete: false,
    readyForMidSummary: false,
    conversationFinished: false,
    question: '',
    ...overrides,
  };
}

Deno.test('buildRichTranscript labels mediator and partners', () => {
  const transcript = buildRichTranscript(
    [
      { message_type: 'question', content: '🎯 @Oboje: Dlaczego?' },
      { message_type: 'message', sender_id: HOST, content: 'Czuję się ignorowany.' },
      { message_type: 'message', sender_id: PARTNER, content: 'To nieprawda.' },
    ],
    HOST
  );
  assertStringIncludes(transcript, '[MEDIATOR]');
  assertStringIncludes(transcript, '[PARTNER_A] Czuję się ignorowany.');
  assertStringIncludes(transcript, '[PARTNER_B] To nieprawda.');
});

Deno.test('conflict question demands facts not feelings', () => {
  const q = buildConflictQuestion('Czuję się ignorowany.', 'To nieprawda.', 'pl');
  assertStringIncludes(q, 'Partner A twierdzi');
  assertStringIncludes(q, 'Partner B twierdzi');
  assertStringIncludes(q, 'fakt');
});

Deno.test('detectEvasiveAnswers detects "bo tak wyszło"', () => {
  const evasive = detectEvasiveAnswers(
    ['Bo tak.', 'Nie wiem.'],
    'Dlaczego nie odpisałeś?',
    'pl'
  );
  assert(evasive);
});

Deno.test('"Tak, o 18:30." is not evasive', () => {
  assertFalse(isAnswerEvasive('Tak, o 18:30.', 'Kiedy?', 'pl'));
  assert(containsConcreteSignal('Tak, o 18:30.'));
});

Deno.test('"Nie, byłem w pracy." is not evasive', () => {
  assertFalse(isAnswerEvasive('Nie, byłem w pracy.', 'Gdzie byłeś?', 'pl'));
});

Deno.test('"Nie pamiętam dokładnie." is not evasive', () => {
  assertFalse(isAnswerEvasive('Nie pamiętam dokładnie.', 'Co się stało?', 'pl'));
});

Deno.test('"Bo tak." is evasive', () => {
  assert(isPureDeflection('Bo tak.'));
  assert(isAnswerEvasive('Bo tak.', 'Dlaczego?', 'pl'));
});

Deno.test('evasion blocks discussion round increment', () => {
  const state = baseState();
  const brain = completeBrain({
    evasionDetected: true,
    evasionReason: 'Brak odpowiedzi na pytanie',
    question: 'Nadal nie odpowiedziałeś.',
  });
  const next = applyBrainEvaluation(state, brain, true);
  const gap = next.identifiedGaps.find((g) => g.id === 'attention_gap')!;
  assertEquals(gap.discussionRounds, 0);
  assertFalse(gap.resolved);
});

Deno.test('gap closes only with AI confidence >= 75', () => {
  const state = baseState();
  const lowConf = completeBrain({
    activeGapResolved: true,
    gapResolveConfidence: 50,
    gapResolveReason: 'Za wcześnie',
    question: 'Podajcie jeszcze jeden fakt.',
  });
  const afterLow = applyBrainEvaluation(state, lowConf, true);
  assertFalse(afterLow.identifiedGaps[0].resolved);

  const highConf = { ...lowConf, gapResolveConfidence: 85, gapResolveReason: 'Obie strony jasno' };
  const afterHigh = applyBrainEvaluation(state, highConf, true);
  assert(afterHigh.identifiedGaps[0].resolved);
});

Deno.test('new gap only when newGapDetected=true', () => {
  const state = baseState();
  const brain = completeBrain({
    newGapDetected: true,
    newGap: { id: 'time_together_gap', description: 'Brak wspólnego czasu' },
    question: 'Ile czasu faktycznie spędzacie razem w tygodniu?',
  });
  const next = applyBrainEvaluation(state, brain, true);
  assert(next.identifiedGaps.some((g) => g.id === 'time_together_gap'));
});

Deno.test('responsibility phase auto-ready when all gaps resolved', () => {
  let state = baseState();
  state = {
    ...state,
    identifiedGaps: state.identifiedGaps.map((g) => ({ ...g, resolved: true })),
    activeGapId: null,
    responsibilityReady: false,
    gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
  };
  state = finalizeConversationIfReady(state);
  assert(state.responsibilityReady);
  assertEquals(resolveConversationPhase(state), 'responsibility');
});

Deno.test('mid summary requires half budget, resolved gaps, and responsibility question', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [{ id: 'g', description: 'x', resolved: true, discussionRounds: 2, priority: 50 }],
    activeGapId: null,
    phase: 'responsibility',
    questionCount: 5,
    sessionQuestionBudget: 12,
    midSummaryShown: false,
    responsibilityReady: true,
    responsibilityQuestionsAsked: 0,
  });
  assertFalse(isReadyForMidSummary(state));

  const eligible = { ...state, questionCount: 6, responsibilityQuestionsAsked: 1 };
  assert(isReadyForMidSummary(eligible));

  const laggingPhase = { ...eligible, phase: 'gap_exploration' as const };
  assert(isReadyForMidSummary(laggingPhase));
});

Deno.test('AI OFF final summary reachable via finalizeConversationIfReady', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [{ id: 'g', description: 'x', resolved: true, discussionRounds: 4, priority: 50 }],
    activeGapId: null,
    gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
    responsibilityReady: true,
    responsibilityComplete: true,
    repairComplete: true,
    repairStep: REPAIR_STEPS_COUNT,
    responsibilityQuestionsAsked: 4,
    repairQuestionsAsked: REPAIR_STEPS_COUNT,
    conversationFinished: false,
  });
  const finalized = finalizeConversationIfReady(state);
  assert(finalized.conversationFinished);
  assert(isReadyForFinalSummary(finalized));
});

Deno.test('enforceShortQuestion caps at 2 sentences', () => {
  const long =
    'Pierwsze zdanie. Drugie zdanie. Trzecie zdanie. Czwarte zdanie.';
  const short = enforceShortQuestion(long);
  assertEquals(short.split(/(?<=[.!?])\s+/).length, 2);
});

Deno.test('full scenario: ignored -> facts -> gap -> no premature close', () => {
  const evasive = detectEvasiveAnswers(
    ['Wczoraj pisałem 3 razy, zero odpowiedzi.', 'Bo tak wyszło.'],
    buildConflictQuestion('Czuję się ignorowany.', 'To nieprawda.', 'pl'),
    'pl'
  );
  assert(evasive);

  let state = baseState();
  const deepenBrain = buildFallbackBrain(state, 'pl', {
    questionKind: 'deepen',
    activeGap: state.identifiedGaps[0],
    evasive: true,
    lastQuestion: 'Podajcie fakty.',
    lastAnswers: ['Wczoraj pisałem 3 razy.', 'Bo tak wyszło.'],
    convPhase: 'gap_exploration',
  });
  assertStringIncludes(deepenBrain.question, 'Bo tak wyszło');
  assertFalse(deepenBrain.activeGapResolved);

  state = applyBrainEvaluation(state, deepenBrain, true);
  assertEquals(state.identifiedGaps[0].discussionRounds, 0);

  const resolvedBrain = completeBrain({
    activeGapResolved: true,
    gapResolveConfidence: 90,
    gapResolveReason: 'Obie strony podały fakty',
    readyForResponsibility: true,
    question: 'Co każde z was zrobiło, by sytuacja się pogorszyła?',
  });
  state = applyBrainEvaluation(state, resolvedBrain, true);
  assert(state.identifiedGaps[0].resolved);
  assertFalse(state.responsibilityReady);

  state = applyBrainEvaluation(
    {
      ...state,
      gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
      identifiedGaps: state.identifiedGaps.map((g) => ({ ...g, resolved: true })),
      activeGapId: null,
    },
    resolvedBrain,
    true
  );
  assert(state.responsibilityReady);
});

Deno.test('shouldResolveGap requires 4 rounds without OpenAI', () => {
  const gap = { id: 'g', description: 'x', resolved: false, discussionRounds: 3, priority: 50 };
  const brain = completeBrain({ activeGapResolved: true, gapResolveConfidence: 80 });
  assertFalse(shouldResolveGap(gap, brain, false));
  assert(shouldResolveGap({ ...gap, discussionRounds: 4 }, brain, false));
});

Deno.test('mergeNewGaps caps at 2 new gaps per merge', () => {
  const state = baseState();
  const incoming = [
    { id: 'gap_a', description: 'Gap A', resolved: false, discussionRounds: 0, priority: 40 },
    { id: 'gap_b', description: 'Gap B', resolved: false, discussionRounds: 0, priority: 30 },
    { id: 'gap_c', description: 'Gap C', resolved: false, discussionRounds: 0, priority: 20 },
  ];
  const next = mergeNewGaps(state, incoming);
  const added = next.identifiedGaps.filter((g) => g.id.startsWith('gap_'));
  assertEquals(added.length, 2);
});

Deno.test('gap fallback questions vary by discussionRounds', () => {
  const gap0 = { id: 'g', description: 'Komunikacja', resolved: false, discussionRounds: 0, priority: 50 };
  const gap1 = { ...gap0, discussionRounds: 1 };
  const gap3 = { ...gap0, discussionRounds: 3 };
  const q0 = fallbackGapQuestion(gap0, 'pl');
  const q1 = fallbackGapQuestion(gap1, 'pl');
  const q3 = fallbackGapQuestion(gap3, 'pl');
  assertFalse(q0 === q1);
  assertFalse(q1 === q3);
  assertStringIncludes(q0, 'Wygląda na to');
  assertStringIncludes(q3, 'To nadal nie jest jasne');
});

Deno.test('single-sided answer does not increment discussionRounds', () => {
  const state = baseState();
  const brain = completeBrain({ partnerAAnswered: true, partnerBAnswered: false });
  const next = applyBrainEvaluation(state, brain, false);
  assertEquals(next.identifiedGaps[0].discussionRounds, 0);
});

Deno.test('isUsableMediatorQuestion accepts short valid questions', () => {
  assert(isUsableMediatorQuestion('Kto odpisał pierwszy?'));
  assertFalse(isUsableMediatorQuestion('OK'));
  assertFalse(isUsableMediatorQuestion('ab'));
  assert(isUsableMediatorQuestion('This is a concrete factual follow-up without a question mark'));
});

Deno.test('factMemory stores conflicting facts', () => {
  let state = baseState();
  state = recordFactsFromAnswers(
    state,
    'Napisałem o 18:30.',
    'Dostałam wiadomość po 21.',
    2,
    'attention_gap'
  );
  assertEquals(state.factMemory.length, 2);
  assertStringIncludes(state.factMemory[0].fact, '18:30');
  assertStringIncludes(state.factMemory[1].fact, '21');
});

Deno.test('selectNextGap chooses highest priority unresolved gap', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [
      { id: 'low', description: 'low', resolved: false, discussionRounds: 0, priority: 30 },
      { id: 'high', description: 'high', resolved: false, discussionRounds: 0, priority: 90 },
    ],
    activeGapId: 'low',
  });
  const next = selectNextGap(state);
  assertEquals(next?.id, 'high');
});

Deno.test('stanceHistory detects changed claim', () => {
  let state = baseState();
  const first = detectStanceChanges(state, 'partnerA', 'Nie pamiętam tej sytuacji.', 'attention_gap', 1, 'pl');
  state = first.state;
  const second = detectStanceChanges(
    state,
    'partnerA',
    'Pamiętam, ale było inaczej niż mówisz.',
    'attention_gap',
    2,
    'pl'
  );
  assertEquals(second.state.contradictions.length, 1);
  assert(second.contradictionQuestion?.includes('Nie pamiętam'));
});

Deno.test('resolutionReason saved on gap close', () => {
  const state = baseState();
  const brain = completeBrain({
    activeGapResolved: true,
    gapResolveConfidence: 90,
    gapResolveReason: 'Both partners gave concrete examples.',
  });
  const next = applyBrainEvaluation(state, brain, true);
  assertStringIncludes(next.identifiedGaps[0].resolutionReason ?? '', 'concrete examples');
});

Deno.test('final summary includes resolutionReason', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [
      {
        id: 'g',
        description: 'Trust gap',
        resolved: true,
        discussionRounds: 4,
        priority: 90,
        resolutionReason: 'Both acknowledged different expectations.',
      },
    ],
  });
  const summary = formatFinalSummaryFallback(state, 'Core conflict', 'en');
  assertStringIncludes(summary, 'Both acknowledged different expectations.');
  assertStringIncludes(summary, 'Resolved gaps');
});

Deno.test('computeSessionQuestionBudget scales with gaps not hardcoded 15', () => {
  const budget = computeSessionQuestionBudget(2, 'short', 'short');
  assertEquals(budget, 14);
  const large = computeSessionQuestionBudget(4, 'x'.repeat(700), 'y'.repeat(700));
  assert(large > budget);
});

Deno.test('parseBrainResult handles structured AI response', () => {
  const parsed = parseBrainResult({
    partnerAAnswered: true,
    partnerBAnswered: false,
    evasionDetected: true,
    evasionReason: 'Partner B deflected',
    activeGapResolved: false,
    gapResolveConfidence: 20,
    gapResolveReason: 'Not enough',
    newGapDetected: false,
    newGap: null,
    readyForResponsibility: false,
    responsibilityComplete: false,
    repairComplete: false,
    readyForMidSummary: false,
    conversationFinished: false,
    question: 'Partner B, powiedziałeś "to nieprawda" — podaj konkretny moment, kiedy odpisałeś.',
  });
  assert(parsed.evasionDetected);
  assertStringIncludes(parsed.question, 'nieprawda');
});

Deno.test('3 evasive rounds deadlock active gap', () => {
  let state = baseState();
  const evasiveBrain = completeBrain({ evasionDetected: true, evasionReason: 'Deflection' });
  for (let i = 0; i < 3; i++) {
    state = applyBrainEvaluation(state, evasiveBrain, true);
  }
  const gap = state.identifiedGaps.find((g) => g.id === 'attention_gap')!;
  assert(gap.deadlocked);
  assert(gap.resolved);
  assertStringIncludes(gap.resolutionReason ?? '', 'deadlocked');
  assertEquals(state.evasionStreak, 0);
});

Deno.test('deadlocked gap appears in final summary as impas', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [
      {
        id: 'attention_gap',
        description: 'Czy partner A jest ignorowany',
        resolved: true,
        deadlocked: true,
        discussionRounds: 3,
        priority: 50,
        resolutionReason: 'Gap closed as deadlocked after repeated evasive answers.',
      },
    ],
    activeGapId: null,
    responsibilityReady: true,
  });
  const summaryPl = formatFinalSummaryFallback(state, 'Core', 'pl');
  assertStringIncludes(summaryPl, 'impas');
  const summaryEn = formatFinalSummaryFallback(state, 'Core', 'en');
  assertStringIncludes(summaryEn, 'deadlock');
});

Deno.test('early AI responsibilityComplete ignored below MIN_RESPONSIBILITY_QUESTIONS', () => {
  const state = normalizeState({
    ...baseState(),
    identifiedGaps: [{ id: 'g', description: 'x', resolved: true, discussionRounds: 2, priority: 50 }],
    activeGapId: null,
    gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
    responsibilityReady: true,
    responsibilityQuestionsAsked: 2,
    responsibilityComplete: false,
  });
  const next = applyBrainEvaluation(
    state,
    completeBrain({ responsibilityComplete: true }),
    true
  );
  assertFalse(next.responsibilityComplete);
  assertEquals(resolveConversationPhase(next), 'responsibility');

  const ready = applyBrainEvaluation(
    { ...state, responsibilityQuestionsAsked: 4 },
    completeBrain({ responsibilityComplete: true }),
    true
  );
  assert(ready.responsibilityComplete);
  assertEquals(resolveConversationPhase(ready), 'repair');
});

Deno.test('getQuestionPhase uses state not legacy thresholds when state exists', () => {
  const gapState = normalizeState({
    ...baseState(),
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
  });
  assertEquals(
    clientGetQuestionPhase(LIVE_PHASE_DEEPENING_END + 5, false, gapState),
    'deepening'
  );
  const resolvedGaps = normalizeState({
    ...gapState,
    identifiedGaps: gapState.identifiedGaps.map((g) => ({ ...g, resolved: true })),
    activeGapId: null,
    responsibilityReady: true,
  });
  assertEquals(
    clientGetQuestionPhase(LIVE_PHASE_OPENING_END + 1, false, resolvedGaps),
    'resolution'
  );
  assertEquals(clientGetQuestionPhase(3, false), 'opening');
  assertEquals(clientGetQuestionPhase(LIVE_PHASE_DEEPENING_END + 1, false), 'resolution');
});

Deno.test('getMediatorPhaseLabel reflects conversation state', () => {
  const gapState = normalizeState({
    ...baseState(),
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
  });
  assertEquals(clientGetMediatorPhaseLabel(gapState, 'pl'), 'Wyjaśnianie różnic');
  const responsibilityState = normalizeState({
    ...gapState,
    identifiedGaps: gapState.identifiedGaps.map((g) => ({ ...g, resolved: true })),
    activeGapId: null,
    responsibilityQuestionsAsked: 1,
    responsibilityReady: true,
  });
  assertEquals(clientGetMediatorPhaseLabel(responsibilityState, 'pl'), 'Odpowiedzialność');
});

function openingResponseUiKinds(response: {
  publicMessage?: string;
  aiQuestion?: string;
  summaryType?: string;
}): string[] {
  const kinds: string[] = [];
  if (response.summaryType === 'opening' && response.publicMessage) kinds.push('summary');
  if (response.aiQuestion) kinds.push('question');
  return kinds;
}

Deno.test('opening_summary returns publicMessage and aiQuestion', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'nie czuje się wysłuchany',
      partnerCombinedDescription: 'czuje, że jej emocje są bagatelizowane',
    },
    undefined
  );
  assert(result.publicMessage);
  assert(result.aiQuestion);
  assertEquals(result.summaryType, 'opening');
  assertEquals(typeof result.publicMessage, 'string');
  assertEquals(typeof result.aiQuestion, 'string');
  assert(result.state);
  assertEquals(typeof result.state, 'object');
  assertEquals(result.state?.openingSummaryDone, true);
  assertEquals(result.state?.mainConflictQuestionAsked, true);
});

Deno.test('opening_summary publicMessage and aiQuestion are distinct strings', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      combinedDescription: 'Opis hosta',
      partnerCombinedDescription: 'Opis partnera',
    },
    undefined
  );
  assert(result.publicMessage);
  assert(result.aiQuestion);
  assertFalse(result.publicMessage === result.aiQuestion);
  assertFalse(result.publicMessage.includes('[object Object]'));
  assertFalse(result.aiQuestion.includes('[object Object]'));
});

Deno.test('opening_summary uses hostName and partnerName', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'Opis Daniela',
      partnerCombinedDescription: 'Opis Agnieszki',
    },
    undefined
  );
  assertStringIncludes(result.publicMessage ?? '', 'Daniel');
  assertStringIncludes(result.publicMessage ?? '', 'Agnieszka');
  assertStringIncludes(result.aiQuestion ?? '', 'Daniel');
  assertStringIncludes(result.aiQuestion ?? '', 'Agnieszka');
});

Deno.test('opening_summary avoids Partner A when names provided', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'Opis',
      partnerCombinedDescription: 'Opis',
    },
    undefined
  );
  assertFalse((result.publicMessage ?? '').includes('Partner A'));
  assertFalse((result.aiQuestion ?? '').includes('Partner A'));
});

Deno.test('publicMessage uses biggest difference label not perception gap', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'Opis',
      partnerCombinedDescription: 'Opis',
    },
    undefined
  );
  assertStringIncludes(result.publicMessage ?? '', 'Największa różnica między waszymi wersjami');
  assertFalse((result.publicMessage ?? '').toLowerCase().includes('luka percepcji'));
});

Deno.test('opening aiQuestion asks for facts not emotions', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'nie czuje się wysłuchany',
      partnerCombinedDescription: 'jej wersja jest ignorowana',
    },
    undefined
  );
  const q = result.aiQuestion ?? '';
  assertStringIncludes(q, 'fakt');
  assertStringIncludes(q, 'wydarzen');
  assertFalse(/opisz(cie)?\s+emocj/i.test(q));
  assertFalse(/jak\s+się\s+czujesz/i.test(q));
});

Deno.test('opening aiQuestion references perspectives', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'nie czuje się wysłuchany',
      partnerCombinedDescription: 'czuje, że jej emocje są bagatelizowane',
    },
    undefined
  );
  assertStringIncludes(result.aiQuestion ?? '', 'Daniel uważa');
  assertStringIncludes(result.aiQuestion ?? '', 'Agnieszka uważa');
});

Deno.test('opening state has mainConflictQuestionAsked and questionCount 1', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'Opis',
      partnerCombinedDescription: 'Opis',
    },
    undefined
  );
  assert(result.state?.mainConflictQuestionAsked);
  assertEquals(result.state?.questionCount, 1);
  assertEquals(result.state?.phase, 'gap_exploration');
});

Deno.test('duplicate first question blocked when already asked', () => {
  const state = normalizeState({
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    questionCount: 1,
    identifiedGaps: [{ id: 'g', description: 'x', resolved: false, discussionRounds: 0, priority: 50 }],
    activeGapId: 'g',
  });
  assert(
    shouldBlockDuplicateFirstQuestion(state, 0, false)
  );
  assertFalse(shouldBlockDuplicateFirstQuestion(state, 1, false));
});

Deno.test('opening UI sequence includes summary and question', async () => {
  const result = await generateOpeningSummary(
    {
      language: 'pl',
      hostName: 'Daniel',
      partnerName: 'Agnieszka',
      combinedDescription: 'Opis',
      partnerCombinedDescription: 'Opis',
    },
    undefined
  );
  assertEquals(openingResponseUiKinds(result), ['summary', 'question']);
});

Deno.test('resolveParticipantNames falls back without body names', () => {
  const pl = resolveParticipantNames({ language: 'pl' }, 'pl');
  assertEquals(pl.nameA, 'Partner A');
  assertEquals(pl.nameB, 'Partnerka/Partner B');
});

Deno.test('formatOpeningSummary uses natural header', () => {
  const summary = formatOpeningSummary(
    'pl',
    'Daniel',
    'Agnieszka',
    'Opis A',
    'Opis B',
    'Sedno',
    'Różnica'
  );
  assertStringIncludes(summary, '📋 Podsumowanie konfliktu');
  assertStringIncludes(summary, 'Daniel');
  assertStringIncludes(summary, 'Największa różnica między waszymi wersjami');
});

Deno.test('buildOpeningFirstQuestion uses Oboje without names', () => {
  const q = buildOpeningFirstQuestion('pl', 'Partner A', 'Partnerka/Partner B', 'A', 'B');
  assertStringIncludes(q, '🎯 Oboje');
});

function baseGapState(): ConversationState {
  return normalizeState({
    phase: 'gap_exploration',
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    identifiedGaps: [
      {
        id: 'intent_gap',
        description: 'Different intentions',
        resolved: false,
        discussionRounds: 2,
      },
    ],
    activeGapId: 'intent_gap',
    questionCount: 3,
  });
}

const neutralBrain: MediatorBrainResult = {
  partnerAAnswered: true,
  partnerBAnswered: true,
  evasionDetected: false,
  evasionReason: '',
  activeGapResolved: false,
  gapResolveConfidence: 0,
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

Deno.test('reconciliation: Kocham cię bardzo detects signal', () => {
  const result = detectReconciliationSignals(
    [{ message_type: 'message', content: 'Kocham cię bardzo', sender_id: 'partner-b' }],
    baseGapState(),
    'pl'
  );
  assert(result.detected);
  assert(result.score >= 2);
});

Deno.test('reconciliation: Dziękuję czuję ulgę detects signal', () => {
  const result = detectReconciliationSignals(
    [{ message_type: 'message', content: 'Dziękuję, czuję ulgę', sender_id: 'partner-b' }],
    baseGapState(),
    'pl'
  );
  assert(result.detected);
});

Deno.test('reconciliation: hard pressing questions are recognized', () => {
  assert(isHardPressingQuestion('Daniel, dlaczego unikasz odpowiedzi?', 'pl'));
  assert(isHardPressingQuestion('Daniel, dlaczego nie odnosisz się do bólu Patrycji?', 'pl'));
  assertFalse(isHardPressingQuestion(buildGenericRepairBothQuestion('pl'), 'pl'));
});

Deno.test('reconciliation: repair transition targets both partners', () => {
  const transition = buildReconciliationTransitionMessage('pl');
  const repair = buildReconciliationRepairQuestion('pl', 'Daniel', 'Patrycja');
  assertStringIncludes(transition, 'Nie będę dalej dociskać');
  assertStringIncludes(repair, 'Daniel i Patrycja');
  assertStringIncludes(repair, 'zasadę');
});

Deno.test('reconciliation: partner B love message is not evasive', () => {
  assertFalse(isAnswerEvasive('Kocham cię bardzo', 'Pytanie?', 'pl'));
  assert(isReconciliationMessage('Kocham cię bardzo', 'pl'));
});

Deno.test('reconciliation: partner B message must not target partner A', () => {
  const hardQ = 'Daniel, dlaczego nie odnosisz się do bólu Patrycji?';
  assert(isSingleTargetedQuestion(hardQ, 'Daniel', 'Patrycja', 'pl'));
  assertFalse(
    shouldAllowSingleTargetQuestion(
      hardQ,
      { ...baseGapState(), reconciliationDetected: true },
      [
        { message_type: 'message', content: 'Kocham cię bardzo', sender_id: 'partner-b' },
      ],
      'host-daniel',
      'pl',
      'Daniel',
      'Patrycja',
      neutralBrain
    )
  );
});

Deno.test('reconciliation: active gap closes as mutual understanding', () => {
  const recent = [
    {
      message_type: 'message',
      content: 'Przepraszam, rozumiem Twój ból.',
      sender_id: 'host-daniel',
    },
    {
      message_type: 'message',
      content: 'Dziękuję, czuję ulgę. Kocham cię bardzo.',
      sender_id: 'partner-patrycja',
    },
  ];
  const closed = applyReconciliationClosure(baseGapState(), recent, 'host-daniel', 'pl');
  assert(closed.reconciliationDetected);
  const gap = closed.identifiedGaps.find((g) => g.id === 'intent_gap');
  assert(gap?.resolved);
  assert(gap?.resolvedByMutualUnderstanding);
  assertFalse(Boolean(gap?.deadlocked));
});

Deno.test('reconciliation: resolved mutual-understanding gap is not re-selected', () => {
  const state = markGapResolvedByMutualUnderstanding(baseGapState());
  const gap = state.identifiedGaps.find((g) => g.id === 'intent_gap');
  assert(gap?.resolvedByMutualUnderstanding);
  assertEquals(selectNextGap(state), null);
});

Deno.test('reconciliation: private hints are supportive not accusatory', () => {
  const hints = buildReconciliationPrivateHints(
    'pl',
    'Daniel',
    'Patrycja',
    'Przepraszam, rozumiem Twój ból.',
    'Dziękuję, czuję ulgę.'
  );
  assertStringIncludes(hints.privateHint?.tone ?? '', 'uznałeś emocje');
  assertStringIncludes(hints.partnerPrivateHint?.tone ?? '', 'ulgę');
  assertFalse((hints.privateHint?.tone ?? '').includes('za mało konkretu'));
});

Deno.test('reconciliation: single-target blocked without evasion after reconciliation', () => {
  const repairBoth = buildGenericRepairBothQuestion('pl');
  assert(
    shouldAllowSingleTargetQuestion(
      repairBoth,
      { ...baseGapState(), reconciliationDetected: true },
      [],
      'host',
      'pl',
      'Daniel',
      'Patrycja',
      neutralBrain
    )
  );
});

Deno.test('reconciliation: repair question contains future rule wording', () => {
  const q = buildReconciliationRepairQuestion('pl', 'Daniel', 'Patrycja');
  assertStringIncludes(q, 'zasadę');
  assertStringIncludes(q, 'następną trudną rozmowę');
});

function stateAfterRepairRuleAnswered(): ConversationState {
  const afterRule = normalizeState({
    ...baseState(),
    gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
    responsibilityComplete: true,
    responsibilityQuestionsAsked: MIN_RESPONSIBILITY_QUESTIONS,
    reconciliationRepairOffered: true,
    repairStep: 0,
    repairQuestionsAsked: 1,
    questionCount: 5,
    currentQuestion: {
      id: 'repair_rule',
      phase: 'repair',
      topic: 'repair_rule',
      askedAtQuestionNumber: 5,
      answered: false,
    },
  });
  return advanceAfterBothAnswered(afterRule, true);
}

Deno.test('v3.6: after repair_rule answered next step is not repair_rule', () => {
  const state = stateAfterRepairRuleAnswered();
  assertEquals(state.repairStep, 1);
  assert(state.currentQuestion?.answered);
  const nextQ = buildRepairStepQuestion(state.repairStep ?? 0, 'pl', 'Daniel', 'Patrycja');
  assertEquals(nextQ.topicId, 'repair_check');
  assertFalse(nextQ.topicId === 'repair_rule');
});

Deno.test('v3.6: mediator never repeats identical question topic after answers', () => {
  const ruleQ = buildRepairStepQuestion(0, 'pl', 'Daniel', 'Patrycja');
  const state = normalizeState({
    ...baseState(),
    currentQuestion: {
      id: 'repair_rule',
      phase: 'repair',
      topic: 'repair_rule',
      askedAtQuestionNumber: 4,
      answered: true,
    },
    repairStep: 1,
  });
  assert(
    wouldRepeatQuestion(state, 'repair_rule', ruleQ.text, [
      { message_type: 'question', content: `🎯 Oboje: ${ruleQ.text}` },
    ])
  );
  const checkQ = buildRepairStepQuestion(1, 'pl', 'Daniel', 'Patrycja');
  assertFalse(wouldRepeatQuestion(state, checkQ.topicId, checkQ.text, []));
});

Deno.test('v3.6: reconciliationRepairOffered does not deadlock mediation', () => {
  const state = stateAfterRepairRuleAnswered();
  const inRepairFlow =
    canEnterRepair(state) ||
    (state.reconciliationRepairOffered && (state.repairStep ?? 0) < REPAIR_STEPS_COUNT);
  assert(inRepairFlow);
  assert((state.repairStep ?? 0) < REPAIR_STEPS_COUNT);
  assertFalse(isReadyForFinalSummary(state));
  const nextQ = buildRepairStepQuestion(state.repairStep ?? 0, 'pl', 'Daniel', 'Patrycja');
  assertEquals(nextQ.topicId, 'repair_check');
});

Deno.test('v3.6: after repair_step_3 triggers final summary readiness', () => {
  const state = finalizeConversationIfReady(
    normalizeState({
      ...baseState(),
      gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
      responsibilityComplete: true,
      reconciliationDetected: true,
      reconciliationRepairOffered: true,
      repairStep: REPAIR_STEPS_COUNT,
      repairQuestionsAsked: REPAIR_STEPS_COUNT,
      repairComplete: true,
      conversationFinished: true,
      identifiedGaps: baseState().identifiedGaps.map((g) => ({
        ...g,
        resolved: true,
        resolvedByMutualUnderstanding: true,
      })),
    })
  );
  assert(isReadyForFinalSummary(state));
  assert(state.conversationFinished);
});

Deno.test('v3.6: gap exploration requires minimum steps before repair', () => {
  const afterFacts = advanceAfterBothAnswered(
    normalizeState({
      ...baseState(),
      gapExplorationStep: 0,
      currentQuestion: {
        id: 'gap_facts',
        phase: 'gap',
        topic: 'gap_facts',
        askedAtQuestionNumber: 1,
        answered: false,
      },
    }),
    true
  );
  assertEquals(afterFacts.gapExplorationStep, 1);
  assertFalse(isGapExplorationComplete(afterFacts));
  assertFalse(canEnterRepair(afterFacts));
  const nextGap = buildGapExplorationStepQuestion(
    afterFacts.gapExplorationStep ?? 0,
    'pl',
    afterFacts.identifiedGaps[0],
    'Daniel',
    'Patrycja'
  );
  assertEquals(nextGap.topicId, 'gap_interpretation');
  assertEquals(resolveConversationPhase(afterFacts), 'gap_exploration');
});

const STRESS_Q =
  'Co zrobicie, jeśli ta zasada zawiedzie w następnym konflikcie — jak zatrzymacie się i wrócicie najpierw do emocji?';
const DANIEL_STRESS =
  'Kiedy zacznę się bronić, zatrzymam rozmowę i wrócę do tego, co czuje Patrycja.';
const PATRYCJA_STRESS =
  'Kiedy emocje przejmą kontrolę, poproszę o przerwę i wrócę do rozmowy z gotowością wysłuchania Daniela.';

function stateAfterStressTestAnswered(): ConversationState {
  return advanceAfterBothAnswered(
    normalizeState({
      ...baseState(),
      gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
      identifiedGaps: baseState().identifiedGaps.map((g) => ({
        ...g,
        resolved: true,
        resolvedByMutualUnderstanding: true,
      })),
      activeGapId: null,
      responsibilityComplete: true,
      responsibilityQuestionsAsked: MIN_RESPONSIBILITY_QUESTIONS,
      reconciliationRepairOffered: true,
      repairStep: 2,
      repairQuestionsAsked: 3,
      questionCount: 8,
      currentQuestion: {
        id: 'repair_stress_test',
        phase: 'repair',
        topic: 'repair_stress_test',
        askedAtQuestionNumber: 8,
        answered: false,
      },
    }),
    true
  );
}

function stressTestRecentMessages() {
  return [
    { message_type: 'question', content: `🎯 Oboje: ${STRESS_Q}` },
    { message_type: 'message', content: DANIEL_STRESS, sender_id: HOST },
    { message_type: 'message', content: PATRYCJA_STRESS, sender_id: PARTNER },
  ];
}

Deno.test('v3.7: after repair_stress_test both answers conversationFinished is true', () => {
  const state = stateAfterStressTestAnswered();
  assert(state.conversationFinished);
  assert(state.repairComplete);
  assertEquals(state.repairStep, REPAIR_STEPS_COUNT);
  assert(state.currentQuestion?.answered);
});

Deno.test('v3.7: repair stress test triggers proposed solution readiness', () => {
  const state = stateAfterStressTestAnswered();
  assert(isReadyForProposedSolution(state));
});

Deno.test('v3.7: applyPostAnswerStateAdvance completes repair from transcript without currentQuestion', () => {
  const body = {
    language: 'pl',
    questionNumber: 8,
    userId: HOST,
    recentMessages: stressTestRecentMessages(),
    state: normalizeState({
      ...baseState(),
      gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
      responsibilityComplete: true,
      repairStep: 2,
      repairQuestionsAsked: 3,
      questionCount: 8,
    }),
  };
  const next = applyPostAnswerStateAdvance(normalizeState(body.state), body);
  assert(next.conversationFinished);
  assert(next.repairComplete);
  assert(next.finalCommitments?.partnerA?.includes('zatrzymam'));
  assert(next.finalCommitments?.partnerB?.includes('przerwę'));
});

Deno.test('v3.7: proposed solution message contains shared rule and commitments', () => {
  const commitments = extractFinalCommitments(DANIEL_STRESS, PATRYCJA_STRESS, 'pl');
  const state = completeRepairFlow(
    normalizeState({ ...baseState(), gapExplorationStep: MIN_GAP_EXPLORATION_STEPS }),
    DANIEL_STRESS,
    PATRYCJA_STRESS,
    'pl'
  );
  const msg = formatProposedSolutionMessage(
    { ...state, finalCommitments: commitments },
    'pl',
    'Daniel',
    'Patrycja'
  );
  assertStringIncludes(msg, 'Propozycja mediatora');
  assertStringIncludes(msg, 'Najpierw zatrzymujemy się przy emocjach');
  assertStringIncludes(msg, 'Daniel');
  assertStringIncludes(msg, 'Patrycja');
  assertStringIncludes(msg, 'zatrzymam');
  assertStringIncludes(msg, 'przerwę');
  assertStringIncludes(msg, 'Plan awaryjny');
  assertStringIncludes(msg, 'Co teraz czujesz');
  assertStringIncludes(msg, 'akceptujecie');
});

Deno.test('v3.7: does not generate another repair question after stress test', () => {
  const state = stateAfterStressTestAnswered();
  assert(isReadyForProposedSolution(state));
  assert((state.repairStep ?? 0) >= REPAIR_STEPS_COUNT);
  assert(
    wouldRepeatQuestion(
      state,
      'repair_stress_test',
      buildRepairStepQuestion(2, 'pl', 'Daniel', 'Patrycja').text,
      stressTestRecentMessages()
    )
  );
});

Deno.test('v3.7: repair closure hints are supportive not critical', () => {
  const hints = buildRepairClosureHints('pl');
  assertStringIncludes(hints.privateHint?.tone ?? '', 'domknięcie');
  assertFalse((hints.privateHint?.tone ?? '').includes('za mało konkretu'));
  assertFalse((hints.privateHint?.tone ?? '').includes('Musisz'));
});

Deno.test('v3.7: isRepairStressTestQuestion detects stress test wording', () => {
  assert(isRepairStressTestQuestion(STRESS_Q));
  assertFalse(isRepairStressTestQuestion('Jaka zasada na następną trudną rozmowę?'));
});

Deno.test('v3.7: shouldCompleteRepairFromTranscript when both answered stress test', () => {
  assert(
    shouldCompleteRepairFromTranscript(
      normalizeState({ ...baseState(), repairStep: 2 }),
      true,
      stressTestRecentMessages()
    )
  );
});

Deno.test('v3.7: conversationFinished state is ready for proposed solution not blocked repair', () => {
  const state = stateAfterStressTestAnswered();
  assert(isReadyForProposedSolution(state));
  assert(isReadyForFinalSummary(finalizeConversationIfReady(state)));
  assertFalse(state.currentQuestion?.id === 'repair_rule');
});

Deno.test('v3.7: extractFinalCommitments captures partner-specific actions', () => {
  const c = extractFinalCommitments(DANIEL_STRESS, PATRYCJA_STRESS, 'pl');
  assertStringIncludes(c.partnerA ?? '', 'zatrzymam');
  assertStringIncludes(c.partnerB ?? '', 'przerwę');
  assertStringIncludes(c.sharedRule ?? '', 'emocj');
  assertStringIncludes(c.fallbackPlan ?? '', 'przerwę');
});

Deno.test('v3.8: duplicate opening blocked when openingSummaryDone', () => {
  const state = normalizeState({ openingSummaryDone: true, questionCount: 1 });
  assert(shouldBlockDuplicateOpening(state, []));
});

Deno.test('v3.8: duplicate opening blocked from recent summary messages', () => {
  const state = normalizeState({ openingSummaryDone: false });
  assert(
    shouldBlockDuplicateOpening(state, [
      { message_type: 'summary', metadata: { summaryKind: 'opening_summary' } },
    ])
  );
});

Deno.test('v3.8: resolveParticipantNames keeps host as nameA regardless of userName', () => {
  const names = resolveParticipantNames(
    {
      hostName: 'Daniel',
      partnerName: 'Patrycja',
      userName: 'Patrycja',
    },
    'pl'
  );
  assertEquals(names.nameA, 'Daniel');
  assertEquals(names.nameB, 'Patrycja');
});

Deno.test('v3.8: gap interpretation question has no chevron quotes', () => {
  const gap = {
    id: 'emotion_gap',
    description: 'Brak wzajemnego zrozumienia emocji partnera',
    resolved: false,
    discussionRounds: 0,
  };
  const q = buildGapExplorationStepQuestion(1, 'pl', gap, 'Daniel', 'Patrycja');
  assertFalse(questionContainsQuotedGapTitle(q.text));
  assertFalse(q.text.includes('«'));
  assertStringIncludes(q.text, 'Wygląda na to');
});

Deno.test('v3.8: humanizeGapDescription rewrites abstract gap titles', () => {
  const human = humanizeGapDescription(
    {
      id: 'g',
      description: 'Brak wzajemnego zrozumienia emocji partnera',
      resolved: false,
      discussionRounds: 0,
    },
    'pl'
  );
  assertStringIncludes(human, 'intencji');
  assertFalse(human.includes('«'));
});

Deno.test('v3.8: wouldRepeatQuestion blocks same topic after answer', () => {
  const q = buildGapExplorationStepQuestion(0, 'pl', baseState().identifiedGaps[0], 'Daniel', 'Patrycja');
  const state = normalizeState({
    ...baseState(),
    currentQuestion: {
      id: 'gap_facts',
      phase: 'gap',
      topic: 'gap_facts',
      askedAtQuestionNumber: 1,
      answered: true,
    },
  });
  assert(wouldRepeatQuestion(state, 'gap_facts', q.text, []));
});

Deno.test('v3.8: answers grouped by replyToQuestionId', () => {
  const grouped = extractAnswersForQuestion(
    [
      { message_type: 'question', content: 'Pytanie?', metadata: { questionId: 'gap_facts' } },
      {
        message_type: 'message',
        content: 'Odpowiedź Daniela',
        sender_id: HOST,
        metadata: { replyToQuestionId: 'gap_facts' },
      },
      {
        message_type: 'message',
        content: 'Odpowiedź Patrycji',
        sender_id: PARTNER,
        metadata: { replyToQuestionId: 'gap_facts' },
      },
      { message_type: 'message', content: 'Stara wiadomość', sender_id: HOST },
    ],
    'gap_facts',
    HOST
  );
  assertEquals(grouped.count, 2);
  assertStringIncludes(grouped.partnerAAnswer, 'Daniela');
  assertStringIncludes(grouped.partnerBAnswer, 'Patrycji');
});

Deno.test('v3.8: first question blocked when gap_facts already asked', () => {
  const state = normalizeState({
    openingSummaryDone: true,
    mainConflictQuestionAsked: true,
    questionCount: 1,
    gapExplorationStep: 1,
    currentQuestion: { id: 'gap_interpretation', phase: 'gap', topic: 'gap_interpretation', askedAtQuestionNumber: 2, answered: false },
  });
  assert(
    shouldBlockDuplicateFirstQuestion(state, 1, false, [
      { message_type: 'question', content: '🎯 Oboje: Każde z was opisze jedno konkretne wydarzenie' },
    ])
  );
});

Deno.test('v3.8: after both answers on currentQuestion advance repair step', () => {
  const after = advanceAfterBothAnswered(
    normalizeState({
      ...baseState(),
      gapExplorationStep: MIN_GAP_EXPLORATION_STEPS,
      responsibilityComplete: true,
      repairStep: 0,
      currentQuestion: {
        id: 'repair_rule',
        phase: 'repair',
        topic: 'repair_rule',
        askedAtQuestionNumber: 5,
        answered: false,
      },
    }),
    true
  );
  assertEquals(after.repairStep, 1);
  assert(after.currentQuestion?.answered);
});

Deno.test('v3.9: truncateSafeSentence removes dangling guillemet quote', () => {
  const broken =
    'Chyba wracamy do starego schematu. Gdy poczuję napięcie, powiem: „Chyba wracamy do starego schematu.';
  const fixed = truncateSafeSentence(broken, 220);
  assertFalse(/„[^"]*$/.test(fixed));
  assert(fixed.length <= 220);
});

Deno.test('v3.9: extractCommitmentFromAnswer does not leave open quote', () => {
  const answer =
    'Gdy poczuję napięcie, powiem: „Chyba wracamy do starego schematu. Zatrzymam rozmowę i wrócę do emocji.';
  const commitment = extractCommitmentFromAnswer(answer, 220);
  assert(commitment.length > 0);
  assertFalse(commitment.endsWith('„'));
  assertFalse(/„[^"]*$/.test(commitment));
});

Deno.test('v3.9: proposed solution commitment headers use em dash', () => {
  const commitments = extractFinalCommitments(DANIEL_STRESS, PATRYCJA_STRESS, 'pl');
  const msg = formatProposedSolutionMessage(
    { ...completeRepairFlow(normalizeState({ ...baseState(), gapExplorationStep: MIN_GAP_EXPLORATION_STEPS }), DANIEL_STRESS, PATRYCJA_STRESS, 'pl'), finalCommitments: commitments },
    'pl',
    'Daniel',
    'Patrycja'
  );
  assertStringIncludes(msg, 'Konkretne zobowiązanie — Daniel:');
  assertStringIncludes(msg, 'Konkretne zobowiązanie — Patrycja:');
  assertFalse(msg.includes('Konkretne zobowiązanie Daniel:'));
});

const POLISH_MARKERS = /\b(każde z was|zasada|oboje|wygląda na to|podsumowanie|propozycja mediatora)\b/i;

Deno.test('v3.10: normalizeLanguage accepts all six codes', () => {
  assertEquals(normalizeLanguage('it'), 'it');
  assertEquals(normalizeLanguage('de'), 'de');
  assertEquals(normalizeLanguage('fr'), 'fr');
  assertEquals(normalizeLanguage('es'), 'es');
  assertEquals(normalizeLanguage('unknown'), 'pl');
});

Deno.test('v3.10: buildGapExplorationStepQuestion it is not Polish', () => {
  const gap = baseState().identifiedGaps[0];
  const q = buildGapExplorationStepQuestion(0, 'it', gap, 'Daniel', 'Patrycja');
  assertFalse(POLISH_MARKERS.test(q.text));
  assertStringIncludes(q.text.toLowerCase(), 'fatt');
});

Deno.test('v3.10: buildRepairStepQuestion de is not Polish', () => {
  const q = buildRepairStepQuestion(1, 'de', 'Daniel', 'Patrycja');
  assertFalse(POLISH_MARKERS.test(q.text));
  assertStringIncludes(q.text.toLowerCase(), 'regel');
});

Deno.test('v3.10: formatProposedSolutionMessage fr is not Polish', () => {
  const commitments = extractFinalCommitments(DANIEL_STRESS, PATRYCJA_STRESS, 'fr');
  const msg = formatProposedSolutionMessage(
    { ...completeRepairFlow(normalizeState({ ...baseState(), gapExplorationStep: MIN_GAP_EXPLORATION_STEPS }), DANIEL_STRESS, PATRYCJA_STRESS, 'fr'), finalCommitments: commitments },
    'fr',
    'Daniel',
    'Patrycja'
  );
  assertFalse(POLISH_MARKERS.test(msg));
  assertStringIncludes(msg, 'médiateur');
});

Deno.test('v3.10: singleSidedPartnerPrompt es is not Polish', () => {
  const prompt = singleSidedPartnerPrompt('es');
  assertFalse(POLISH_MARKERS.test(prompt));
  assertStringIncludes(prompt.toLowerCase(), 'partner');
});

Deno.test('v3.10: OpenAI brain prompt contains Italian language name', () => {
  const prompt = buildBrainSystemPrompt('it');
  assertStringIncludes(prompt, 'Italian');
  assertStringIncludes(prompt, 'CRITICAL: Write all user-facing text only in Italian.');
});

Deno.test('v3.10: flow step order unchanged for gap exploration', () => {
  const gap = baseState().identifiedGaps[0];
  const steps = [0, 1, 2, 3].map((s) =>
    buildGapExplorationStepQuestion(s, 'en', gap, 'Daniel', 'Patrycja').topicId
  );
  assertEquals(steps, ['gap_facts', 'gap_interpretation', 'gap_acknowledgment', 'gap_unresolved']);
  const repairSteps = [0, 1, 2].map((s) =>
    buildRepairStepQuestion(s, 'en', 'Daniel', 'Patrycja').topicId
  );
  assertEquals(repairSteps, ['repair_rule', 'repair_check', 'repair_stress_test']);
});
