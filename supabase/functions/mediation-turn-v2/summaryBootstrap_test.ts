import {
  parseFirstDealLlm,
  parseCompromiseLlm,
  parseDateLlm,
  parseEasyChoicesLlmRounds,
  parseLessonLlm,
  parseSummaryLlmText,
} from './summaryLlm.ts';
import { classifyEasyChoicesBootstrap } from './easyChoicesBootstrap.ts';
import { classifySummaryBootstrap } from './summaryBootstrap.ts';
import { parseTurnRequest } from './request.ts';
import { applyUserTransition, retryTransition } from './transitions.ts';
import { buildEnvelope } from './envelope.ts';
import { parseStartGenerationResult } from './sessionParse.ts';
import type { MediationSessionRow } from './types.ts';
import { AppError } from './errors.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertThrows(fn: () => unknown): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return;
    throw error;
  }
  throw new Error('Expected AppError');
}

function baseSession(
  overrides: Partial<MediationSessionRow> = {}
): MediationSessionRow {
  return {
    session_id: '00000000-0000-4000-8000-000000000001',
    mediation_id: '00000000-0000-4000-8000-000000000002',
    couple_id: '00000000-0000-4000-8000-000000000003',
    host_user_id: '00000000-0000-4000-8000-000000000004',
    partner_user_id: '00000000-0000-4000-8000-000000000005',
    conflict_category: 'money',
    session_payload: {
      summary: null,
      easyChoices: {
        rounds: [],
        answers: { HOST: {}, PARTNER: {} },
        currentRound: 1,
      },
      firstDealVotes: { HOST: null, PARTNER: null },
      confirmations: {
        SUMMARY: { HOST: false, PARTNER: false },
        COMPROMISE: { HOST: false, PARTNER: false },
        LESSON: { HOST: false, PARTNER: false },
        DATE: { HOST: false, PARTNER: false },
      },
      metadata: { llmCallCount: 0 },
    },
    session_version: 1,
    current_screen: 'SUMMARY',
    generation_status: 'IDLE',
    last_generation_kind: 'SUMMARY',
    progress_total: 6,
    prompt_version: 'summary-v2-1',
    model_version: 'claude-sonnet-4-20250514',
    ...overrides,
  };
}

function fiveRounds() {
  return Array.from({ length: 5 }, (_, i) => ({
    roundIndex: i + 1,
    question: `Q${i + 1}`,
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
  }));
}

Deno.test('parseSummaryLlmText accepts plain JSON', () => {
  assertEquals(parseSummaryLlmText('{"text":"Hello"}'), 'Hello');
});

Deno.test('parseSummaryLlmText strips one outer fence', () => {
  assertEquals(
    parseSummaryLlmText('```json\n{"text":"Inside"}\n```'),
    'Inside'
  );
});

Deno.test('parseSummaryLlmText rejects extra keys', () => {
  assertThrows(() =>
    parseSummaryLlmText('{"text":"x","nextScreen":"EASY_CHOICES"}')
  );
});

Deno.test('parseEasyChoicesLlmRounds accepts contract JSON', () => {
  const rounds = parseEasyChoicesLlmRounds(
    '{"rounds":[{"title":"Q1","choices":["a","b","c","d"]}]}'
  );
  assertEquals(rounds.length, 1);
  assertEquals(rounds[0].title, 'Q1');
  assertEquals(rounds[0].choices[0], 'a');
});

Deno.test('parseEasyChoicesLlmRounds rejects non-rounds root', () => {
  assertThrows(() => parseEasyChoicesLlmRounds('{"text":"nope"}'));
});

Deno.test('parseFirstDeal / Compromise / Lesson / Date', () => {
  assertEquals(
    parseFirstDealLlm('{"dealText":"Go for a walk"}').dealText,
    'Go for a walk'
  );
  assertEquals(
    parseCompromiseLlm(
      '{"dealText":"Split chores","whyItFitsBoth":"Fair"}'
    ).whyItFitsBoth,
    'Fair'
  );
  assertEquals(
    parseLessonLlm('{"observation":"Obs","lesson":"Les"}').lesson,
    'Les'
  );
  assertEquals(
    parseDateLlm(
      '{"dateIdea":"Park","scenario":["1","2","3"]}'
    ).dateIdea,
    'Park'
  );
});

Deno.test('parseTurnRequest bootstrap and session', () => {
  const boot = parseTurnRequest({
    mediationId: '00000000-0000-4000-8000-000000000001',
    requestId: '00000000-0000-4000-8000-000000000002',
    action: 'START_OR_RESUME',
  });
  assertEquals(boot.ok, true);
  if (boot.ok) assertEquals(boot.value.kind, 'bootstrap');

  const sess = parseTurnRequest({
    sessionId: '00000000-0000-4000-8000-000000000001',
    requestId: '00000000-0000-4000-8000-000000000002',
    action: { type: 'CONTINUE', optionId: null, voteValue: null },
  });
  assertEquals(sess.ok, true);
  if (sess.ok) assertEquals(sess.value.kind, 'session');

  const bad = parseTurnRequest({
    sessionId: '00000000-0000-4000-8000-000000000001',
    requestId: '00000000-0000-4000-8000-000000000002',
    action: { type: 'VOTE', optionId: 'a', voteValue: 'yes' },
  });
  assertEquals(bad.ok, false);
});

Deno.test('classifySummaryBootstrap generate vs resume', () => {
  const base = baseSession({
    generation_status: 'GENERATING_CONTENT',
    last_generation_kind: 'SUMMARY',
    session_payload: { summary: null },
  });
  assertEquals(classifySummaryBootstrap(base).kind, 'generate');
  assertEquals(
    classifySummaryBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: { summary: 'Done' },
    }).kind,
    'resume'
  );
});

Deno.test('classifyEasyChoicesBootstrap generate vs resume', () => {
  const base = baseSession({
    current_screen: 'EASY_CHOICES',
    generation_status: 'GENERATING_CONTENT',
    last_generation_kind: 'EASY_CHOICES',
    session_payload: {
      summary: 'Done',
      easyChoices: {
        rounds: [],
        answers: { HOST: {}, PARTNER: {} },
        currentRound: 1,
      },
    },
  });
  assertEquals(classifyEasyChoicesBootstrap(base).kind, 'generate');
  assertEquals(
    classifyEasyChoicesBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: {
        summary: 'Done',
        easyChoices: {
          rounds: fiveRounds(),
          answers: { HOST: {}, PARTNER: {} },
          currentRound: 1,
        },
      },
    }).kind,
    'resume'
  );
});

Deno.test('SUMMARY CONTINUE Case A vs Case B', () => {
  const session = baseSession({
    session_payload: {
      ...baseSession().session_payload,
      summary: 'Text',
      confirmations: {
        SUMMARY: { HOST: false, PARTNER: true },
        COMPROMISE: { HOST: false, PARTNER: false },
        LESSON: { HOST: false, PARTNER: false },
        DATE: { HOST: false, PARTNER: false },
      },
    },
  });
  const caseB = applyUserTransition({
    session,
    talker: 'HOST',
    action: { type: 'CONTINUE', optionId: null, voteValue: null },
  });
  assertEquals(caseB.nextScreen, 'EASY_CHOICES');
  assertEquals(caseB.kickoffGeneration, 'EASY_CHOICES');

  const caseA = applyUserTransition({
    session: baseSession({
      session_payload: {
        ...baseSession().session_payload,
        summary: 'Text',
      },
    }),
    talker: 'HOST',
    action: { type: 'CONTINUE', optionId: null, voteValue: null },
  });
  assertEquals(caseA.nextScreen, 'SUMMARY');
  assertEquals(caseA.kickoffGeneration, null);
});

Deno.test('FIRST_DEAL YES+YES kicks LESSON; otherwise COMPROMISE', () => {
  const payload = {
    ...baseSession().session_payload,
    firstDeal: { dealText: 'Deal' },
    firstDealVotes: { HOST: 'yes', PARTNER: null },
  };
  const yesYes = applyUserTransition({
    session: baseSession({
      current_screen: 'FIRST_DEAL',
      session_payload: payload,
    }),
    talker: 'PARTNER',
    action: { type: 'VOTE', optionId: null, voteValue: 'yes' },
  });
  assertEquals(yesYes.kickoffGeneration, 'LESSON');
  assertEquals(yesYes.progressTotal, 6);

  const compromise = applyUserTransition({
    session: baseSession({
      current_screen: 'FIRST_DEAL',
      session_payload: payload,
    }),
    talker: 'PARTNER',
    action: { type: 'VOTE', optionId: null, voteValue: 'no' },
  });
  assertEquals(compromise.kickoffGeneration, 'COMPROMISE');
  assertEquals(compromise.progressTotal, 7);
});

Deno.test('buildEnvelope SUMMARY has CONTINUE action', () => {
  const envelope = buildEnvelope({
    session: baseSession({
      generation_status: 'IDLE',
      session_payload: {
        ...baseSession().session_payload,
        summary: 'Hello',
      },
    }),
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(envelope.ok, true);
  assertEquals(envelope.screen, 'SUMMARY');
  assertEquals(envelope.content.summary, 'Hello');
  assertEquals(envelope.actions[0]?.type, 'CONTINUE');
});

Deno.test('parseStartGenerationResult CLAIMED / ALREADY_CLAIMED / COMPLETED', () => {
  const sessionRow = {
    session_id: '00000000-0000-4000-8000-000000000001',
    mediation_id: '00000000-0000-4000-8000-000000000002',
    couple_id: '00000000-0000-4000-8000-000000000003',
    host_user_id: '00000000-0000-4000-8000-000000000004',
    partner_user_id: '00000000-0000-4000-8000-000000000005',
    conflict_category: 'money',
    session_payload: { metadata: { llmCallCount: 1 } },
    session_version: 4,
    current_screen: 'EASY_CHOICES',
    generation_status: 'GENERATING_CONTENT',
    last_generation_kind: 'EASY_CHOICES',
    progress_total: 6,
    prompt_version: 'x',
    model_version: 'y',
  };

  const claimed = parseStartGenerationResult({
    outcome: 'CLAIMED',
    claimToken: '00000000-0000-4000-8000-0000000000aa',
    reclaimed: false,
    session: sessionRow,
  });
  assertEquals(claimed.outcome, 'CLAIMED');
  if (claimed.outcome === 'CLAIMED') {
    assertEquals(claimed.session.session_version, 4);
    assertEquals(claimed.claimToken, '00000000-0000-4000-8000-0000000000aa');
  }

  const already = parseStartGenerationResult({
    outcome: 'ALREADY_CLAIMED',
    session: sessionRow,
  });
  assertEquals(already.outcome, 'ALREADY_CLAIMED');

  const completed = parseStartGenerationResult({
    outcome: 'ALREADY_COMPLETED',
    response: { ok: true, sessionId: 'x', screen: 'SUMMARY', sessionVersion: 1, correlationId: 'y' },
  });
  assertEquals(completed.outcome, 'ALREADY_COMPLETED');
});

Deno.test('RETRY transition kicks same last_generation_kind', () => {
  const t = retryTransition({
    session: baseSession({
      generation_status: 'FAILED',
      last_generation_kind: 'COMPROMISE',
      current_screen: 'FIRST_DEAL',
      progress_total: 7,
    }),
  });
  assertEquals(t.kickoffGeneration, 'COMPROMISE');
  assertEquals(t.generationStatus, 'GENERATING_COMPROMISE');
  assertEquals(t.nextScreen, 'FIRST_DEAL');
});
