/**
 * Evaluation Serialization — unit tests (Phase 4N).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/evaluationSerialization.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { serializeEvaluation } from '@/services/mediatorEngine/evaluation/serialization';
import { calculateEvaluationScore } from '@/services/mediatorEngine/evaluation/scoring';

function createBundle(overrides: Partial<EvaluationBundle> = {}): EvaluationBundle {
  return {
    conversationId: 'test-conversation',
    conversationTitle: 'Test Conversation',
    status: 'PASS',
    runResult: {
      conversationId: 'test-conversation',
      status: 'PASS',
      executedTurns: 2,
      turns: [],
    },
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

describe('serializeEvaluation', () => {
  it('serializes without score', () => {
    const bundle = createBundle();
    const serialized = serializeEvaluation(bundle);

    assert.equal(serialized.conversation.id, 'test-conversation');
    assert.equal(serialized.conversation.title, 'Test Conversation');
    assert.equal(serialized.conversation.status, 'PASS');
    assert.equal(serialized.run.executedTurns, 2);
    assert.equal(serialized.run.status, 'PASS');
    assert.deepEqual(serialized.goal, bundle.goalEvaluation);
    assert.deepEqual(serialized.strategy, bundle.strategyEvaluation);
    assert.deepEqual(serialized.intervention, bundle.interventionEvaluation!);
    assert.deepEqual(serialized.safety, bundle.safetyEvaluation);
    assert.equal(serialized.score, null);
  });

  it('serializes with score', () => {
    const bundle = createBundle();
    const score = calculateEvaluationScore(bundle);
    const serialized = serializeEvaluation(bundle, score);

    assert.deepEqual(serialized.score, score);
    assert.equal(serialized.score!.grade, 'A');
    assert.equal(serialized.score!.overallScore, 1);
  });

  it('sets intervention to null when undefined', () => {
    const bundle = createBundle({ interventionEvaluation: undefined });
    const serialized = serializeEvaluation(bundle);

    assert.equal(serialized.intervention, null);
  });

  it('sets metadata.version to "1"', () => {
    const serialized = serializeEvaluation(createBundle());

    assert.equal(serialized.metadata.version, '1');
  });

  it('includes generatedAt in metadata', () => {
    const serialized = serializeEvaluation(createBundle());

    assert.ok(typeof serialized.metadata.generatedAt === 'string');
    assert.ok(serialized.metadata.generatedAt.length > 0);
    assert.ok(!Number.isNaN(Date.parse(serialized.metadata.generatedAt)));
  });
});
