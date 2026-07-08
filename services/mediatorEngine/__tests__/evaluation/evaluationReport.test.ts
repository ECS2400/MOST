/**
 * Evaluation Report — unit tests (Phase 4K).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/evaluationReport.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { formatEvaluationReport } from '@/services/mediatorEngine/evaluation/report';
import { runConversationEvaluation } from '@/services/mediatorEngine/evaluation/runner';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';

function createEmptyListsBundle(): EvaluationBundle {
  return {
    conversationId: 'empty-lists',
    conversationTitle: 'Empty Lists',
    status: 'PASS',
    runResult: {
      conversationId: 'empty-lists',
      status: 'PASS',
      executedTurns: 0,
      turns: [],
    },
    goalEvaluation: {
      expectedGoalPath: [],
      actualGoalPath: [],
      matchedPrefixLength: 0,
      completedExpectedGoals: [],
      missingGoals: [],
      unexpectedGoals: [],
      exactMatch: true,
    },
    strategyEvaluation: {
      expectedStrategies: [],
      actualStrategies: [],
      matchedStrategies: [],
      missingStrategies: [],
      unexpectedStrategies: [],
      coverage: 1,
      exactMatch: true,
    },
    safetyEvaluation: {
      expectedSafety: 'none',
      observedSafety: 'none',
      exactMatch: true,
      isSaferThanExpected: false,
      isLessSafeThanExpected: false,
    },
  };
}

describe('formatEvaluationReport', () => {
  it('renders Goal section', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Goal Progression/);
    assert.match(report, /Expected/);
    assert.match(report, /Actual/);
    assert.match(report, /Matched Prefix/);
    assert.match(report, /Missing Goals/);
    assert.match(report, /Unexpected Goals/);
    assert.match(report, /Exact Match/);
  });

  it('renders Strategy section', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Strategy Evaluation/);
    assert.match(report, /Coverage/);
    assert.match(report, /Matched/);
    assert.match(report, /Missing/);
    assert.match(report, /Unexpected/);
  });

  it('renders Safety section', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Safety/);
    assert.match(report, /Expected/);
    assert.match(report, /Observed/);
    assert.match(report, /Exact Match/);
    assert.match(report, /Safer Than Expected/);
    assert.match(report, /Less Safe Than Expected/);
  });

  it('renders Run Summary', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Run Summary/);
    assert.match(report, /Executed Turns/);
    assert.match(report, /Run Status/);
    assert.match(report, /PASS/);
  });

  it('renders Intervention section when available', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation, [
      'validate',
      'reflect',
    ]);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Intervention Evaluation/);
    assert.match(report, /Expected/);
    assert.match(report, /Actual/);
    assert.match(report, /Coverage/);
    assert.doesNotMatch(report, /Intervention evaluation not available/);
  });

  it('handles missing interventionEvaluation', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);
    const report = formatEvaluationReport(bundle);

    assert.match(report, /## Intervention Evaluation/);
    assert.match(report, /Intervention evaluation not available\./);
  });

  it('does not throw on empty lists', () => {
    const bundle = createEmptyListsBundle();

    assert.doesNotThrow(() => formatEvaluationReport(bundle));
    const report = formatEvaluationReport(bundle);

    assert.match(report, /\(none\)/);
    assert.match(report, /- \(none\)/);
    assert.match(report, /## Goal Progression/);
    assert.match(report, /## Strategy Evaluation/);
    assert.match(report, /## Safety/);
    assert.match(report, /## Run Summary/);
  });
});
