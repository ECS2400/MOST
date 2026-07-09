/**
 * Ending Benchmark — integration tests (Phase 5J).
 * Osobny od golden benchmark 20/20; nie wpływa na replay scoring 5I.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ENDING_CONVERSATIONS } from '@/services/mediatorEngine/__tests__/endingConversations';
import { brokenPromisesEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/broken-promises-ending';
import { futurePlanningEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/future-planning-ending';
import { recurringArgumentsEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/recurring-arguments-ending';
import { GOLDEN_CONVERSATIONS } from '@/services/mediatorEngine/__tests__/goldenConversations';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import {
  formatEndingBenchmarkReport,
  runEndingBenchmark,
  runEndingEvaluation,
} from '@/services/mediatorEngine/evaluation/ending';

describe('ending benchmark — isolation from 5I golden benchmark', () => {
  it('ENDING_CONVERSATIONS does not include golden replay scenarios', () => {
    const goldenIds = new Set(GOLDEN_CONVERSATIONS.map((conversation) => conversation.id));

    for (const ending of ENDING_CONVERSATIONS) {
      assert.equal(goldenIds.has(ending.id), false);
    }
  });

  it('future-planning-ending is not in GOLDEN_CONVERSATIONS', () => {
    const goldenIds = GOLDEN_CONVERSATIONS.map((conversation) => conversation.id);
    assert.equal(goldenIds.includes('future-planning-ending'), false);
  });
});

describe('future-planning-ending — ending quality (Phase 5J.2)', () => {
  it('has 14 host/partner messages', () => {
    const hostPartner = futurePlanningEndingConversation.messages.filter(
      (message) => message.speaker === 'host' || message.speaker === 'partner'
    );
    assert.equal(hostPartner.length, 14);
  });

  it('runs full pipeline for all 14 turns', async () => {
    const bundle = await runEndingEvaluation(futurePlanningEndingConversation);

    assert.equal(bundle.pipelineStatus, 'PASS');
    assert.equal(bundle.executedTurns, 14);
    assert.equal(bundle.runResult.turns.length, 14);
  });

  it('passes ending quality with ending-aware stub provider', async () => {
    const bundle = await runEndingEvaluation(futurePlanningEndingConversation);
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'PASS');
    assert.equal(quality.canMeasureEndingQuality, true);
    assert.equal(quality.stubDetected, false);
    assert.equal(quality.forbiddenViolations, 0);
    assert.equal(quality.closingQuestionDetected, true);
    assert.ok(quality.conceptsMatched >= 6);
    assert.ok(quality.evaluatedText);
    assert.match(quality.evaluatedText!, /mały krok/i);
  });

  it('deterministic production stub remains DIAGNOSTIC_LIMITED when explicitly used', async () => {
    const bundle = await runEndingEvaluation(futurePlanningEndingConversation, {
      llmProvider: createDeterministicStubProvider(),
    });
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'DIAGNOSTIC_LIMITED');
    assert.equal(quality.canMeasureEndingQuality, false);
    assert.equal(quality.stubDetected, true);
  });

  it('ending benchmark report shows PASS with ending-aware stub', async () => {
    const result = await runEndingBenchmark([...ENDING_CONVERSATIONS]);
    const report = formatEndingBenchmarkReport(result);

    assert.equal(result.total, 3);
    assert.equal(result.passed, 3);
    assert.equal(result.diagnosticLimited, 0);
    assert.equal(result.failed, 0);
    assert.match(report, /future-planning-ending/);
    assert.match(report, /broken-promises-ending/);
    assert.match(report, /recurring-arguments-ending/);
    assert.match(report, /Pass\s+3/);
  });
});

describe('broken-promises-ending — ending quality (Phase 5J.3)', () => {
  it('has 14 host/partner messages', () => {
    const hostPartner = brokenPromisesEndingConversation.messages.filter(
      (message) => message.speaker === 'host' || message.speaker === 'partner'
    );
    assert.equal(hostPartner.length, 14);
  });

  it('runs full pipeline for all 14 turns', async () => {
    const bundle = await runEndingEvaluation(brokenPromisesEndingConversation);

    assert.equal(bundle.pipelineStatus, 'PASS');
    assert.equal(bundle.executedTurns, 14);
    assert.equal(bundle.runResult.turns.length, 14);
  });

  it('passes ending quality with ending-aware stub provider', async () => {
    const bundle = await runEndingEvaluation(brokenPromisesEndingConversation);
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'PASS');
    assert.equal(quality.canMeasureEndingQuality, true);
    assert.equal(quality.stubDetected, false);
    assert.equal(quality.forbiddenViolations, 0);
    assert.equal(quality.closingQuestionDetected, true);
    assert.ok(quality.conceptsMatched >= 6);
    assert.ok(quality.evaluatedText);
    assert.match(quality.evaluatedText!, /rachunk/i);
    assert.match(quality.evaluatedText!, /zaufan/i);
  });

  it('deterministic production stub remains DIAGNOSTIC_LIMITED when explicitly used', async () => {
    const bundle = await runEndingEvaluation(brokenPromisesEndingConversation, {
      llmProvider: createDeterministicStubProvider(),
    });
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'DIAGNOSTIC_LIMITED');
    assert.equal(quality.canMeasureEndingQuality, false);
    assert.equal(quality.stubDetected, true);
  });
});

describe('recurring-arguments-ending — ending quality (Phase 5J.4)', () => {
  it('has 14 host/partner messages', () => {
    const hostPartner = recurringArgumentsEndingConversation.messages.filter(
      (message) => message.speaker === 'host' || message.speaker === 'partner'
    );
    assert.equal(hostPartner.length, 14);
  });

  it('runs full pipeline for all 14 turns', async () => {
    const bundle = await runEndingEvaluation(recurringArgumentsEndingConversation);

    assert.equal(bundle.pipelineStatus, 'PASS');
    assert.equal(bundle.executedTurns, 14);
    assert.equal(bundle.runResult.turns.length, 14);
  });

  it('passes ending quality with ending-aware stub provider', async () => {
    const bundle = await runEndingEvaluation(recurringArgumentsEndingConversation);
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'PASS');
    assert.equal(quality.canMeasureEndingQuality, true);
    assert.equal(quality.stubDetected, false);
    assert.equal(quality.forbiddenViolations, 0);
    assert.equal(quality.closingQuestionDetected, true);
    assert.ok(quality.conceptsMatched >= 6);
    assert.ok(quality.evaluatedText);
    assert.match(quality.evaluatedText!, /stop/i);
    assert.match(quality.evaluatedText!, /20 minut/i);
  });

  it('deterministic production stub remains DIAGNOSTIC_LIMITED when explicitly used', async () => {
    const bundle = await runEndingEvaluation(recurringArgumentsEndingConversation, {
      llmProvider: createDeterministicStubProvider(),
    });
    const quality = bundle.endingQuality;

    assert.equal(quality.status, 'DIAGNOSTIC_LIMITED');
    assert.equal(quality.canMeasureEndingQuality, false);
    assert.equal(quality.stubDetected, true);
  });
});
