import {
  parseEasyChoicesLlmRounds,
  parseSummaryLlmText,
} from './summaryLlm.ts';
import { classifyEasyChoicesBootstrap } from './easyChoicesBootstrap.ts';
import { classifySummaryBootstrap } from './summaryBootstrap.ts';
import type { MediationSessionRow } from './types.ts';
import { AppError } from './errors.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
  assertThrows(() =>
    parseEasyChoicesLlmRounds('{"text":"nope"}')
  );
});

Deno.test('classifySummaryBootstrap generate vs resume', () => {
  const base: MediationSessionRow = {
    session_id: '00000000-0000-4000-8000-000000000001',
    mediation_id: '00000000-0000-4000-8000-000000000002',
    couple_id: '00000000-0000-4000-8000-000000000003',
    host_user_id: '00000000-0000-4000-8000-000000000004',
    partner_user_id: '00000000-0000-4000-8000-000000000005',
    conflict_category: 'money',
    session_payload: { summary: null },
    session_version: 1,
    current_screen: 'SUMMARY',
    generation_status: 'GENERATING_CONTENT',
    last_generation_kind: 'SUMMARY',
    progress_total: 6,
    prompt_version: 'summary-v2-1',
    model_version: 'claude-sonnet-4-20250514',
  };

  assertEquals(classifySummaryBootstrap(base).kind, 'generate');
  assertEquals(
    classifySummaryBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: { summary: 'Done' },
    }).kind,
    'resume'
  );
  assertEquals(
    classifySummaryBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: { summary: null },
    }).kind,
    'unsupported'
  );
});

Deno.test('classifyEasyChoicesBootstrap generate vs resume', () => {
  const base: MediationSessionRow = {
    session_id: '00000000-0000-4000-8000-000000000001',
    mediation_id: '00000000-0000-4000-8000-000000000002',
    couple_id: '00000000-0000-4000-8000-000000000003',
    host_user_id: '00000000-0000-4000-8000-000000000004',
    partner_user_id: '00000000-0000-4000-8000-000000000005',
    conflict_category: 'money',
    session_payload: {
      summary: 'Done',
      easyChoices: {
        rounds: [],
        answers: { HOST: {}, PARTNER: {} },
        currentRound: 0,
      },
    },
    session_version: 2,
    current_screen: 'EASY_CHOICES',
    generation_status: 'GENERATING_CONTENT',
    last_generation_kind: 'EASY_CHOICES',
    progress_total: 6,
    prompt_version: 'summary-v2-1',
    model_version: 'claude-sonnet-4-20250514',
  };

  assertEquals(classifyEasyChoicesBootstrap(base).kind, 'generate');
  assertEquals(
    classifyEasyChoicesBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: {
        summary: 'Done',
        easyChoices: {
          rounds: [{ title: 'Q1', choices: ['a', 'b'] }],
          answers: { HOST: {}, PARTNER: {} },
          currentRound: 1,
        },
      },
    }).kind,
    'resume'
  );
  assertEquals(
    classifyEasyChoicesBootstrap({
      ...base,
      generation_status: 'IDLE',
      session_payload: {
        easyChoices: { rounds: [], currentRound: 0 },
      },
    }).kind,
    'unsupported'
  );
});
