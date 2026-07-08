/**
 * Evaluation Score — unit tests (Phase 4M).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/evaluationScore.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { calculateEvaluationScore } from '@/services/mediatorEngine/evaluation/scoring';

function createBundle(overrides: Partial<EvaluationBundle> = {}): EvaluationBundle {
  return {
    conversationId: 'test-conversation',
    conversationTitle: 'Test Conversation',
    status: 'PASS',
    runResult: {
      conversationId: 'test-conversation',
      status: 'PASS',
      executedTurns: 1,
      turns: [],
    },
    goalEvaluation: {
      expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING'],
      actualGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING'],
      matchedPrefixLength: 3,
      completedExpectedGoals: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING'],
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
    interventionEvaluation: {
      expectedInterventions: ['validate', 'reflect'],
      actualInterventions: ['validate', 'reflect'],
      matchedInterventions: ['validate', 'reflect'],
      missingInterventions: [],
      unexpectedInterventions: [],
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
    ...overrides,
  };
}

describe('calculateEvaluationScore', () => {
  it('returns perfect score', () => {
    const score = calculateEvaluationScore(createBundle());

    assert.equal(score.goalScore, 1);
    assert.equal(score.strategyScore, 1);
    assert.equal(score.interventionScore, 1);
    assert.equal(score.safetyScore, 1);
    assert.equal(score.overallScore, 1);
    assert.equal(score.grade, 'A');
  });

  it('lowers goalScore when goals are missing', () => {
    const score = calculateEvaluationScore(
      createBundle({
        goalEvaluation: {
          expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
          actualGoalPath: ['SAFE_OPENING'],
          matchedPrefixLength: 1,
          completedExpectedGoals: ['SAFE_OPENING'],
          missingGoals: ['EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
          unexpectedGoals: [],
          exactMatch: false,
        },
      })
    );

    assert.equal(score.goalScore, 0.25);
    assert.ok(score.overallScore < 1);
  });

  it('uses partial strategy coverage', () => {
    const score = calculateEvaluationScore(
      createBundle({
        strategyEvaluation: {
          expectedStrategies: ['validate_emotions', 'hold_space', 'reduce_tension', 'prepare_agreement'],
          actualStrategies: ['validate_emotions', 'hold_space'],
          matchedStrategies: ['validate_emotions', 'hold_space'],
          missingStrategies: ['reduce_tension', 'prepare_agreement'],
          unexpectedStrategies: [],
          coverage: 0.5,
          exactMatch: false,
        },
      })
    );

    assert.equal(score.strategyScore, 0.5);
  });

  it('defaults interventionScore to 1.0 when interventionEvaluation is undefined', () => {
    const score = calculateEvaluationScore(
      createBundle({
        interventionEvaluation: undefined,
      })
    );

    assert.equal(score.interventionScore, 1);
    assert.equal(score.overallScore, 1);
  });

  it('sets safetyScore to 0 when safety is below expectation', () => {
    const score = calculateEvaluationScore(
      createBundle({
        safetyEvaluation: {
          expectedSafety: 'L2',
          observedSafety: 'L1',
          exactMatch: false,
          isSaferThanExpected: false,
          isLessSafeThanExpected: true,
        },
      })
    );

    assert.equal(score.safetyScore, 0);
    assert.equal(score.overallScore, 0.75);
  });

  it('maps grades from overallScore', () => {
    assert.equal(
      calculateEvaluationScore(
        createBundle({
          goalEvaluation: {
            expectedGoalPath: ['SAFE_OPENING'],
            actualGoalPath: ['SAFE_OPENING'],
            matchedPrefixLength: 1,
            completedExpectedGoals: ['SAFE_OPENING'],
            missingGoals: [],
            unexpectedGoals: [],
            exactMatch: true,
          },
          strategyEvaluation: {
            expectedStrategies: ['validate_emotions'],
            actualStrategies: ['validate_emotions'],
            matchedStrategies: ['validate_emotions'],
            missingStrategies: [],
            unexpectedStrategies: [],
            coverage: 0.9,
            exactMatch: true,
          },
          interventionEvaluation: undefined,
        })
      ).grade,
      'A'
    );

    assert.equal(
      calculateEvaluationScore(
        createBundle({
          strategyEvaluation: {
            expectedStrategies: ['validate_emotions', 'hold_space'],
            actualStrategies: ['validate_emotions'],
            matchedStrategies: ['validate_emotions'],
            missingStrategies: ['hold_space'],
            unexpectedStrategies: [],
            coverage: 0.5,
            exactMatch: false,
          },
          interventionEvaluation: undefined,
        })
      ).grade,
      'B'
    );

    assert.equal(
      calculateEvaluationScore(
        createBundle({
          goalEvaluation: {
            expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
            actualGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
            matchedPrefixLength: 2,
            completedExpectedGoals: ['SAFE_OPENING', 'EMOTION_NAMING'],
            missingGoals: ['NEED_NAMING', 'AGREEMENT'],
            unexpectedGoals: [],
            exactMatch: false,
          },
          strategyEvaluation: {
            expectedStrategies: ['validate_emotions', 'hold_space', 'reduce_tension'],
            actualStrategies: ['validate_emotions', 'hold_space'],
            matchedStrategies: ['validate_emotions', 'hold_space'],
            missingStrategies: ['reduce_tension'],
            unexpectedStrategies: [],
            coverage: 2 / 3,
            exactMatch: false,
          },
          interventionEvaluation: undefined,
        })
      ).grade,
      'C'
    );

    assert.equal(
      calculateEvaluationScore(
        createBundle({
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
            expectedStrategies: ['validate_emotions', 'hold_space'],
            actualStrategies: ['validate_emotions'],
            matchedStrategies: ['validate_emotions'],
            missingStrategies: ['hold_space'],
            unexpectedStrategies: [],
            coverage: 0.5,
            exactMatch: false,
          },
          interventionEvaluation: undefined,
        })
      ).grade,
      'D'
    );

    assert.equal(
      calculateEvaluationScore(
        createBundle({
          goalEvaluation: {
            expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
            actualGoalPath: [],
            matchedPrefixLength: 0,
            completedExpectedGoals: [],
            missingGoals: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING', 'AGREEMENT'],
            unexpectedGoals: [],
            exactMatch: false,
          },
          strategyEvaluation: {
            expectedStrategies: ['validate_emotions', 'hold_space', 'reduce_tension', 'prepare_agreement'],
            actualStrategies: [],
            matchedStrategies: [],
            missingStrategies: ['validate_emotions', 'hold_space', 'reduce_tension', 'prepare_agreement'],
            unexpectedStrategies: [],
            coverage: 0,
            exactMatch: false,
          },
          interventionEvaluation: {
            expectedInterventions: ['validate', 'reflect'],
            actualInterventions: [],
            matchedInterventions: [],
            missingInterventions: ['validate', 'reflect'],
            unexpectedInterventions: [],
            coverage: 0,
            exactMatch: false,
          },
          safetyEvaluation: {
            expectedSafety: 'L2',
            observedSafety: 'none',
            exactMatch: false,
            isSaferThanExpected: false,
            isLessSafeThanExpected: true,
          },
        })
      ).grade,
      'F'
    );
  });
});
