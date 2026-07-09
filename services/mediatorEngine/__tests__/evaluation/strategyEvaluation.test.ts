/**
 * Strategy Evaluation — unit tests (Phase 4F).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/strategyEvaluation.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import {
  dedupePreservingOrder,
  evaluateStrategies,
  extractActualStrategies,
} from '@/services/mediatorEngine/evaluation/strategy';
import type { TherapeuticStrategy } from '@/types/mediator/engineTypes';

function createRun(strategies: TherapeuticStrategy[]): ConversationRunResult {
  const turns: TurnTrace[] = strategies.map((strategy, index) => ({
    turnNumber: index + 1,
    speaker: index % 2 === 0 ? 'host' : 'partner',
    inputMessage: `message-${index + 1}`,
    currentGoal: 'SAFE_OPENING',
    strategy,
    interventionType: 'validate',
    goalTransition: 'stay',
    sessionMemory: {} as TurnTrace['sessionMemory'],
    mediationState: {} as TurnTrace['mediationState'],
    finalMediatorMessage: {} as TurnTrace['finalMediatorMessage'],
    safetyLevel: 'none',
    compliance: {} as TurnTrace['compliance'],
  }));

  return {
    conversationId: 'test-conversation',
    status: 'PASS',
    executedTurns: turns.length,
    turns,
  };
}

function createConversation(expectedStrategies: TherapeuticStrategy[]): GoldenConversation {
  return {
    id: 'test-conversation',
    title: 'Test',
    description: 'Test',
    difficulty: 'low',
    tags: [],
    expectedGoalPath: ['SAFE_OPENING'],
    expectedStrategies,
    safetyExpectation: 'none',
    participants: {
      host: { role: 'host', typicalEmotions: [] },
      partner: { role: 'partner', typicalEmotions: [] },
    },
    openingSituation: 'Test',
    expectedMediatorBehaviour: [],
    forbiddenMediatorBehaviour: [],
    conversationOutline: [],
    successCriteria: [],
  };
}

describe('extractActualStrategies', () => {
  it('removes duplicate strategies while preserving first occurrence order', () => {
    const run = createRun([
      'validate_emotions',
      'validate_emotions',
      'hold_space',
      'hold_space',
      'reduce_tension',
    ]);

    assert.deepEqual(extractActualStrategies(run), [
      'validate_emotions',
      'hold_space',
      'reduce_tension',
    ]);
    assert.deepEqual(
      dedupePreservingOrder([
        'validate_emotions',
        'validate_emotions',
        'hold_space',
        'hold_space',
        'reduce_tension',
      ]),
      ['validate_emotions', 'hold_space', 'reduce_tension']
    );
  });
});

describe('evaluateStrategies', () => {
  it('exactMatch is true when expected equals actual after deduplication', () => {
    const expected: TherapeuticStrategy[] = [
      'validate_emotions',
      'hold_space',
      'reduce_tension',
    ];
    const run = createRun(expected);
    const conversation = createConversation(expected);
    const evaluation = evaluateStrategies(run, conversation);

    assert.equal(evaluation.exactMatch, true);
    assert.deepEqual(evaluation.expectedStrategies, expected);
    assert.deepEqual(evaluation.actualStrategies, expected);
    assert.deepEqual(evaluation.matchedStrategies, expected);
    assert.deepEqual(evaluation.missingStrategies, []);
    assert.deepEqual(evaluation.unexpectedStrategies, []);
    assert.equal(evaluation.coverage, 1);
  });

  it('computes coverage for partial match', () => {
    const expected: TherapeuticStrategy[] = [
      'validate_emotions',
      'hold_space',
      'reduce_tension',
      'prepare_agreement',
    ];
    const actual: TherapeuticStrategy[] = ['validate_emotions', 'hold_space'];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateStrategies(run, conversation);

    assert.equal(evaluation.exactMatch, false);
    assert.equal(evaluation.coverage, 0.5);
    assert.deepEqual(evaluation.matchedStrategies, ['validate_emotions', 'hold_space']);
  });

  it('detects missing strategies', () => {
    const expected: TherapeuticStrategy[] = [
      'validate_emotions',
      'hold_space',
      'reduce_tension',
    ];
    const actual: TherapeuticStrategy[] = ['validate_emotions'];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateStrategies(run, conversation);

    assert.deepEqual(evaluation.missingStrategies, ['hold_space', 'reduce_tension']);
    assert.equal(evaluation.coverage, 1 / 3);
  });

  it('uses expectedReplayStrategies when present', () => {
    const fullExpected: TherapeuticStrategy[] = [
      'validate_emotions',
      'hold_space',
      'reduce_tension',
      'prepare_agreement',
    ];
    const replayExpected: TherapeuticStrategy[] = ['validate_emotions'];
    const actual: TherapeuticStrategy[] = ['validate_emotions'];
    const run = createRun(actual);
    const conversation: GoldenConversation = {
      ...createConversation(fullExpected),
      expectedReplayStrategies: replayExpected,
    };
    const evaluation = evaluateStrategies(run, conversation);

    assert.ok(fullExpected.length > replayExpected.length);
    assert.equal(evaluation.exactMatch, true);
    assert.equal(evaluation.coverage, 1);
    assert.deepEqual(evaluation.expectedStrategies, replayExpected);
    assert.deepEqual(evaluation.actualStrategies, replayExpected);
    assert.deepEqual(evaluation.matchedStrategies, replayExpected);
    assert.deepEqual(evaluation.missingStrategies, []);
    assert.deepEqual(evaluation.unexpectedStrategies, []);
  });

  it('detects unexpected strategies', () => {
    const expected: TherapeuticStrategy[] = ['validate_emotions', 'hold_space'];
    const actual: TherapeuticStrategy[] = [
      'validate_emotions',
      'hold_space',
      'build_safety',
      'close_topic',
    ];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateStrategies(run, conversation);

    assert.deepEqual(evaluation.unexpectedStrategies, ['build_safety', 'close_topic']);
    assert.deepEqual(evaluation.missingStrategies, []);
    assert.equal(evaluation.coverage, 1);
  });
});
