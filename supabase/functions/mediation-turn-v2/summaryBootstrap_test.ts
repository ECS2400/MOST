import {
  parseFirstDealLlm,
  parseCompromiseLlm,
  parseDateLlm,
  parseEasyChoicesLlmRounds,
  parseLessonLlm,
  parseSummaryLlmText,
} from './summaryLlm.ts';
import { classifyEasyChoicesBootstrap } from './easyChoicesBootstrap.ts';
import {
  isReadOnlyBootstrapResume,
  planBootstrapResume,
} from './bootstrapResume.ts';
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
    model_version: 'claude-haiku-4-5-20251001',
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

function fiveRoundsLlmJson(): string {
  const rounds = Array.from({ length: 5 }, (_, i) => ({
    title: `Q${i + 1}`,
    choices: ['A', 'B', 'C', 'D'],
  }));
  return JSON.stringify({ rounds });
}

Deno.test('parseEasyChoicesLlmRounds accepts exactly 5 rounds', () => {
  const rounds = parseEasyChoicesLlmRounds(fiveRoundsLlmJson());
  assertEquals(rounds.length, 5);
  assertEquals(rounds[0].title, 'Q1');
  assertEquals(rounds[0].choices[0], 'A');
});

Deno.test('parseEasyChoicesLlmRounds rejects 4 rounds', () => {
  const rounds = Array.from({ length: 4 }, (_, i) => ({
    title: `Q${i + 1}`,
    choices: ['A', 'B', 'C', 'D'],
  }));
  try {
    parseEasyChoicesLlmRounds(JSON.stringify({ rounds }));
    throw new Error('Expected AppError');
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    assertEquals(error.publicCode, 'LLM_INVALID_RESPONSE');
    assertEquals(error.stage, 'parse_easy_choices_rounds');
  }
});

Deno.test('parseEasyChoicesLlmRounds rejects 6 rounds', () => {
  const rounds = Array.from({ length: 6 }, (_, i) => ({
    title: `Q${i + 1}`,
    choices: ['A', 'B', 'C', 'D'],
  }));
  try {
    parseEasyChoicesLlmRounds(JSON.stringify({ rounds }));
    throw new Error('Expected AppError');
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    assertEquals(error.publicCode, 'LLM_INVALID_RESPONSE');
  }
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

function easyChoicesSession(
  overrides: Partial<{
    answers: { HOST: Record<string, string>; PARTNER: Record<string, string> };
    currentRound: number;
  }> = {}
) {
  return baseSession({
    current_screen: 'EASY_CHOICES',
    generation_status: 'IDLE',
    last_generation_kind: 'EASY_CHOICES',
    session_payload: {
      ...baseSession().session_payload,
      summary: 'Done',
      easyChoices: {
        rounds: fiveRounds(),
        answers: overrides.answers ?? { HOST: {}, PARTNER: {} },
        currentRound: overrides.currentRound ?? 1,
      },
    },
  });
}

Deno.test('EASY_CHOICES first VOTE uses option id from round 1 (1-based)', () => {
  const session = easyChoicesSession();
  const envelope = buildEnvelope({
    session,
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(envelope.content.roundIndex, 1);
  assertEquals(envelope.content.totalRounds, 5);
  const optionId = envelope.actions[0]?.id;
  assertEquals(typeof optionId, 'string');
  assertEquals(optionId, 'a');

  const voted = applyUserTransition({
    session,
    talker: 'HOST',
    action: { type: 'VOTE', optionId: optionId!, voteValue: null },
  });
  assertEquals(voted.nextScreen, 'EASY_CHOICES');
  assertEquals(voted.kickoffGeneration, null);
  const answers = (voted.sessionPayload.easyChoices as {
    answers: { HOST: Record<string, string> };
  }).answers;
  assertEquals(answers.HOST['1'], 'a');
});

Deno.test('EASY_CHOICES host then partner on round 1 advances to round 2', () => {
  const afterHost = applyUserTransition({
    session: easyChoicesSession(),
    talker: 'HOST',
    action: { type: 'VOTE', optionId: 'a', voteValue: null },
  });
  const afterPartner = applyUserTransition({
    session: baseSession({
      current_screen: 'EASY_CHOICES',
      generation_status: 'IDLE',
      last_generation_kind: 'EASY_CHOICES',
      session_payload: afterHost.sessionPayload,
    }),
    talker: 'PARTNER',
    action: { type: 'VOTE', optionId: 'b', voteValue: null },
  });
  assertEquals(afterPartner.nextScreen, 'EASY_CHOICES');
  const easy = afterPartner.sessionPayload.easyChoices as {
    currentRound: number;
    answers: { HOST: Record<string, string>; PARTNER: Record<string, string> };
  };
  assertEquals(easy.currentRound, 2);
  assertEquals(easy.answers.HOST['1'], 'a');
  assertEquals(easy.answers.PARTNER['1'], 'b');
});

Deno.test('EASY_CHOICES round 5 both answers kick FIRST_DEAL', () => {
  const answers = {
    HOST: { '1': 'a', '2': 'a', '3': 'a', '4': 'a' },
    PARTNER: { '1': 'b', '2': 'b', '3': 'b', '4': 'b' },
  };
  const afterHost = applyUserTransition({
    session: easyChoicesSession({ answers, currentRound: 5 }),
    talker: 'HOST',
    action: { type: 'VOTE', optionId: 'a', voteValue: null },
  });
  const afterPartner = applyUserTransition({
    session: baseSession({
      current_screen: 'EASY_CHOICES',
      generation_status: 'IDLE',
      last_generation_kind: 'EASY_CHOICES',
      session_payload: afterHost.sessionPayload,
    }),
    talker: 'PARTNER',
    action: { type: 'VOTE', optionId: 'b', voteValue: null },
  });
  assertEquals(afterPartner.kickoffGeneration, 'FIRST_DEAL');
  assertEquals(afterPartner.generationStatus, 'GENERATING_CONTENT');
});

Deno.test('EASY_CHOICES indexing is consistently 1-based', () => {
  const session = easyChoicesSession({ currentRound: 1 });
  const envelope = buildEnvelope({
    session,
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(envelope.content.roundIndex, 1);
  const rounds = (
    session.session_payload.easyChoices as { rounds: Array<{ roundIndex: number }> }
  ).rounds;
  assertEquals(rounds[0].roundIndex, 1);
  assertEquals(rounds[4].roundIndex, 5);
  // Array access uses currentRound - 1
  assertEquals(rounds[Number(envelope.content.roundIndex) - 1].roundIndex, 1);
});

Deno.test('EASY_CHOICES with only 4 stored rounds rejects VOTE', () => {
  const four = Array.from({ length: 4 }, (_, i) => ({
    roundIndex: i + 1,
    question: `Q${i + 1}`,
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
  }));
  try {
    applyUserTransition({
      session: baseSession({
        current_screen: 'EASY_CHOICES',
        generation_status: 'IDLE',
        last_generation_kind: 'EASY_CHOICES',
        session_payload: {
          ...baseSession().session_payload,
          summary: 'Done',
          easyChoices: {
            rounds: four,
            answers: { HOST: {}, PARTNER: {} },
            currentRound: 1,
          },
        },
      }),
      talker: 'HOST',
      action: { type: 'VOTE', optionId: 'a', voteValue: null },
    });
    throw new Error('Expected AppError');
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    assertEquals(error.publicCode, 'UNSUPPORTED_SESSION_STATE');
    assertEquals(error.stage, 'easy_choices_empty');
  }
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
  assertEquals(envelope.actions[0]?.disabled, false);
});

function summaryHostConfirmedPayload() {
  return {
    ...baseSession().session_payload,
    summary: 'Wspólne podsumowanie',
    confirmations: {
      SUMMARY: { HOST: true, PARTNER: false },
      COMPROMISE: { HOST: false, PARTNER: false },
      LESSON: { HOST: false, PARTNER: false },
      DATE: { HOST: false, PARTNER: false },
    },
  };
}

Deno.test('Host SUMMARY CONTINUE then Case A leaves partner free to act', () => {
  const beforeVersion = 3;
  const session = baseSession({
    generation_status: 'IDLE',
    session_version: beforeVersion,
    session_payload: {
      ...baseSession().session_payload,
      summary: 'Hello',
    },
  });
  const hostEnvelope = buildEnvelope({
    session,
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(hostEnvelope.actions[0]?.type, 'CONTINUE');
  assertEquals(hostEnvelope.actions[0]?.disabled, false);

  const afterHost = applyUserTransition({
    session,
    talker: 'HOST',
    action: { type: 'CONTINUE', optionId: null, voteValue: null },
  });
  assertEquals(afterHost.nextScreen, 'SUMMARY');
  assertEquals(afterHost.kickoffGeneration, null);
  assertEquals(
    (afterHost.sessionPayload.confirmations as { SUMMARY: { HOST: boolean } })
      .SUMMARY.HOST,
    true
  );

  // START_OR_RESUME for this state is read-only — no version bump in plan
  const resumed = baseSession({
    generation_status: 'IDLE',
    session_version: beforeVersion + 1,
    session_payload: afterHost.sessionPayload,
  });
  assertEquals(isReadOnlyBootstrapResume(resumed), true);
  assertEquals(planBootstrapResume(resumed).kind, 'read_envelope');
});

Deno.test('Partner START_OR_RESUME on host-confirmed SUMMARY gets active CONTINUE', () => {
  const session = baseSession({
    generation_status: 'IDLE',
    session_version: 4,
    session_payload: summaryHostConfirmedPayload(),
  });
  assertEquals(isReadOnlyBootstrapResume(session), true);

  const partnerEnvelope = buildEnvelope({
    session,
    talker: 'PARTNER',
    correlationId: '00000000-0000-4000-8000-0000000000aa',
  });
  assertEquals(partnerEnvelope.screen, 'SUMMARY');
  assertEquals(partnerEnvelope.content.summary, 'Wspólne podsumowanie');
  assertEquals(partnerEnvelope.content.hostConfirmed, true);
  assertEquals(partnerEnvelope.content.partnerConfirmed, false);
  assertEquals(partnerEnvelope.actions[0]?.type, 'CONTINUE');
  assertEquals(partnerEnvelope.actions[0]?.disabled, false);
  // Resume must not imply mutation of version in envelope source session
  assertEquals(partnerEnvelope.sessionVersion, 4);

  const hostEnvelope = buildEnvelope({
    session,
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-0000000000bb',
  });
  assertEquals(hostEnvelope.actions[0]?.disabled, true);
  assertEquals(hostEnvelope.sessionVersion, 4);
});

Deno.test('Partner CONTINUE after host advances to EASY_CHOICES kickoff', () => {
  const session = baseSession({
    generation_status: 'IDLE',
    session_payload: summaryHostConfirmedPayload(),
  });
  const both = applyUserTransition({
    session,
    talker: 'PARTNER',
    action: { type: 'CONTINUE', optionId: null, voteValue: null },
  });
  assertEquals(both.nextScreen, 'EASY_CHOICES');
  assertEquals(
    both.kickoffGeneration === 'EASY_CHOICES' || both.kickoffGeneration === null,
    true
  );
});

Deno.test('Repeated read-only bootstrap plan never requires generation for IDLE SUMMARY', () => {
  const session = baseSession({
    generation_status: 'IDLE',
    session_version: 4,
    session_payload: summaryHostConfirmedPayload(),
  });
  assertEquals(planBootstrapResume(session).kind, 'read_envelope');
  assertEquals(planBootstrapResume(session).kind, 'read_envelope');
  assertEquals(isReadOnlyBootstrapResume(session), true);
});

Deno.test('buildEnvelope END with FIRST_DEAL agreement', () => {
  const envelope = buildEnvelope({
    session: baseSession({
      current_screen: 'END',
      generation_status: 'IDLE',
      session_payload: {
        ...baseSession().session_payload,
        agreement: {
          source: 'FIRST_DEAL',
          acceptance: 'ACCEPTED_BY_BOTH',
          text: 'Spacer co wieczór',
          createdAt: '2026-07-15T10:00:00.000Z',
        },
      },
    }),
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(envelope.screen, 'END');
  assertEquals(
    (envelope.content.agreement as { source: string; text: string }).source,
    'FIRST_DEAL'
  );
  assertEquals(
    (envelope.content.agreement as { source: string; text: string }).text,
    'Spacer co wieczór'
  );
  assertEquals(typeof envelope.content.closingMessage, 'string');
  assertEquals(envelope.actions[0]?.type, 'CLOSE');
  // Public slice only — no acceptance / createdAt / full payload keys
  assertEquals(
    Object.keys(envelope.content.agreement as object).sort().join(','),
    'source,text'
  );
  assertEquals(envelope.content.confirmations, undefined);
  assertEquals(envelope.content.firstDeal, undefined);
  assertEquals(envelope.content.easyChoices, undefined);
});

Deno.test('buildEnvelope END with COMPROMISE agreement', () => {
  const envelope = buildEnvelope({
    session: baseSession({
      current_screen: 'END',
      progress_total: 7,
      generation_status: 'IDLE',
      session_payload: {
        ...baseSession().session_payload,
        agreement: {
          source: 'COMPROMISE',
          acceptance: 'GENERATED_FINAL',
          text: 'Podział budżetu 60/40',
          createdAt: '2026-07-15T11:00:00.000Z',
        },
      },
    }),
    talker: 'PARTNER',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  assertEquals(envelope.screen, 'END');
  assertEquals(
    (envelope.content.agreement as { source: string; text: string }).source,
    'COMPROMISE'
  );
  assertEquals(
    (envelope.content.agreement as { source: string; text: string }).text,
    'Podział budżetu 60/40'
  );
  assertEquals(
    Object.keys(envelope.content.agreement as object).sort().join(','),
    'source,text'
  );
});

Deno.test('buildEnvelope END without agreement throws UNSUPPORTED_SESSION_STATE', () => {
  try {
    buildEnvelope({
      session: baseSession({
        current_screen: 'END',
        generation_status: 'IDLE',
      }),
      talker: 'HOST',
      correlationId: '00000000-0000-4000-8000-000000000099',
    });
    throw new Error('Expected AppError');
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    assertEquals(error.publicCode, 'UNSUPPORTED_SESSION_STATE');
    assertEquals(error.stage, 'end_agreement_missing');
  }
});

Deno.test('buildEnvelope END with invalid agreement source throws', () => {
  try {
    buildEnvelope({
      session: baseSession({
        current_screen: 'END',
        generation_status: 'IDLE',
        session_payload: {
          ...baseSession().session_payload,
          agreement: {
            source: 'LESSON',
            acceptance: 'ACCEPTED_BY_BOTH',
            text: 'Nie powinno przejść',
            createdAt: '2026-07-15T10:00:00.000Z',
          },
        },
      }),
      talker: 'HOST',
      correlationId: '00000000-0000-4000-8000-000000000099',
    });
    throw new Error('Expected AppError');
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    assertEquals(error.publicCode, 'UNSUPPORTED_SESSION_STATE');
  }
});

Deno.test('buildEnvelope END public content does not leak full payload', () => {
  const envelope = buildEnvelope({
    session: baseSession({
      current_screen: 'END',
      generation_status: 'IDLE',
      session_payload: {
        ...baseSession().session_payload,
        summary: 'sekretne podsumowanie',
        firstDeal: { dealText: 'tajne' },
        compromise: { dealText: 'tajne2', whyItFitsBoth: 'x' },
        lesson: { observation: 'o', lesson: 'l' },
        date: { dateIdea: 'd', scenario: ['a'] },
        agreement: {
          source: 'FIRST_DEAL',
          acceptance: 'ACCEPTED_BY_BOTH',
          text: 'Jawne ustalenie',
          createdAt: '2026-07-15T10:00:00.000Z',
        },
      },
    }),
    talker: 'HOST',
    correlationId: '00000000-0000-4000-8000-000000000099',
  });
  const keys = Object.keys(envelope.content).sort();
  assertEquals(keys.join(','), 'agreement,closingMessage');
  assertEquals(
    Object.keys(envelope.content.agreement as object).sort().join(','),
    'source,text'
  );
  assertEquals(
    (envelope.content.agreement as { text: string }).text,
    'Jawne ustalenie'
  );
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
