/**
 * Benchmark Report Builder — unit tests (Phase 5A).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/benchmarkReport.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BenchmarkResult } from '@/services/mediatorEngine/evaluation/benchmark/types';
import { buildBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkReport';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { calculateEvaluationScore } from '@/services/mediatorEngine/evaluation/scoring';

function createBundle(
  id: string,
  title: string,
  status: EvaluationBundle['status'],
  overrides: Partial<EvaluationBundle> = {}
): EvaluationBundle {
  return {
    conversationId: id,
    conversationTitle: title,
    status,
    runResult: {
      conversationId: id,
      status,
      executedTurns: status === 'PASS' ? 2 : 0,
      turns: [],
      ...(status === 'SKIPPED' ? { skipReason: 'messages_missing' } : {}),
      ...(status === 'FAILED' ? { failureReason: 'runtime_error' } : {}),
    },
    goalEvaluation: {
      expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
      actualGoalPath: ['SAFE_OPENING'],
      matchedPrefixLength: 1,
      completedExpectedGoals: ['SAFE_OPENING'],
      missingGoals: ['EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
      unexpectedGoals: [],
      exactMatch: false,
    },
    strategyEvaluation: {
      expectedStrategies: ['validate_emotions', 'hold_space', 'reduce_tension', 'prepare_agreement'],
      actualStrategies: ['validate_emotions', 'hold_space'],
      matchedStrategies: ['validate_emotions', 'hold_space'],
      missingStrategies: ['reduce_tension', 'prepare_agreement'],
      unexpectedStrategies: [],
      coverage: 0.5,
      exactMatch: false,
    },
    interventionEvaluation: undefined,
    safetyEvaluation: {
      expectedSafety: 'none',
      observedSafety: 'none',
      exactMatch: true,
      isSaferThanExpected: false,
      isLessSafeThanExpected: false,
    },
    ...overrides,
  };
}

function createBenchmarkResult(results: EvaluationBundle[]): BenchmarkResult {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    switch (result.status) {
      case 'PASS':
        passed += 1;
        break;
      case 'FAILED':
        failed += 1;
        break;
      case 'SKIPPED':
        skipped += 1;
        break;
      default:
        break;
    }
  }

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    results,
  };
}

describe('buildBenchmarkReport', () => {
  it('applies skip-aware scoring and benchmark partitions', () => {
    const highPassBundle = createBundle('high-pass', 'High Pass', 'PASS', {
      goalEvaluation: {
        expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
        actualGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
        matchedPrefixLength: 2,
        completedExpectedGoals: ['SAFE_OPENING', 'EMOTION_NAMING'],
        missingGoals: [],
        unexpectedGoals: [],
        exactMatch: true,
      },
      strategyEvaluation: {
        expectedStrategies: ['validate_emotions', 'hold_space'],
        actualStrategies: ['validate_emotions', 'hold_space'],
        matchedStrategies: ['validate_emotions', 'hold_space'],
        missingStrategies: [],
        unexpectedStrategies: [],
        coverage: 1,
        exactMatch: true,
      },
    });

    const lowPassBundle = createBundle('low-pass', 'Low Pass', 'PASS');
    const skippedBundle = createBundle('skipped-one', 'Skipped One', 'SKIPPED');
    const failedBundle = createBundle('failed-one', 'Failed One', 'FAILED', {
      safetyEvaluation: {
        expectedSafety: 'L2',
        observedSafety: 'L1',
        exactMatch: false,
        isSaferThanExpected: false,
        isLessSafeThanExpected: true,
      },
    });

    const benchmarkResult = createBenchmarkResult([
      lowPassBundle,
      highPassBundle,
      skippedBundle,
      failedBundle,
    ]);

    const report = buildBenchmarkReport(benchmarkResult);
    const highPassScore = calculateEvaluationScore(highPassBundle);
    const lowPassScore = calculateEvaluationScore(lowPassBundle);

    assert.equal(report.total, 4);
    assert.equal(report.passed, 2);
    assert.equal(report.skipped, 1);
    assert.equal(report.failed, 1);

    assert.equal(
      report.averageGoalScore,
      (highPassScore.goalScore + lowPassScore.goalScore) / 2
    );
    assert.equal(
      report.averageOverallScore,
      (highPassScore.overallScore + lowPassScore.overallScore) / 2
    );

    const highPassReport = report.conversations.find(
      (conversation) => conversation.conversationId === 'high-pass'
    );
    const lowPassReport = report.conversations.find(
      (conversation) => conversation.conversationId === 'low-pass'
    );
    const skippedReport = report.conversations.find(
      (conversation) => conversation.conversationId === 'skipped-one'
    );
    const failedReport = report.conversations.find(
      (conversation) => conversation.conversationId === 'failed-one'
    );

    assert.equal(highPassReport!.grade, highPassScore.grade);
    assert.equal(lowPassReport!.grade, lowPassScore.grade);
    assert.equal(highPassReport!.overallScore, highPassScore.overallScore);
    assert.equal(lowPassReport!.overallScore, lowPassScore.overallScore);

    assert.equal(skippedReport!.goalScore, null);
    assert.equal(skippedReport!.strategyScore, null);
    assert.equal(skippedReport!.interventionScore, null);
    assert.equal(skippedReport!.safetyScore, null);
    assert.equal(skippedReport!.overallScore, null);
    assert.equal(skippedReport!.grade, null);

    assert.equal(failedReport!.goalScore, null);
    assert.equal(failedReport!.strategyScore, null);
    assert.equal(failedReport!.interventionScore, null);
    assert.equal(failedReport!.safetyScore, null);
    assert.equal(failedReport!.overallScore, null);
    assert.equal(failedReport!.grade, null);

    assert.deepEqual(
      report.rankedConversations.map((conversation) => conversation.conversationId),
      ['high-pass', 'low-pass']
    );
    assert.deepEqual(
      report.skippedConversations.map((conversation) => conversation.conversationId),
      ['skipped-one']
    );
    assert.deepEqual(
      report.failedConversations.map((conversation) => conversation.conversationId),
      ['failed-one']
    );
  });
});
