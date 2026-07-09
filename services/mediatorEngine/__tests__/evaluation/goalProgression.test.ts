/**
 * Goal Progression Evaluation — unit tests (Phase 4B).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/goalProgression.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import {
  collapseConsecutiveGoals,
  evaluateGoalProgression,
  extractActualGoalPath,
} from '@/services/mediatorEngine/evaluation/goalProgression';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

function createRun(goals: TherapeuticGoal[]): ConversationRunResult {
  const turns: TurnTrace[] = goals.map((currentGoal, index) => ({
    turnNumber: index + 1,
    speaker: index % 2 === 0 ? 'host' : 'partner',
    inputMessage: `message-${index + 1}`,
    currentGoal,
    strategy: 'validate_emotions',
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

function createConversation(expectedGoalPath: TherapeuticGoal[]): GoldenConversation {
  return {
    id: 'test-conversation',
    title: 'Test',
    description: 'Test',
    difficulty: 'low',
    tags: [],
    expectedGoalPath,
    expectedStrategies: [],
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

describe('extractActualGoalPath', () => {
  it('removes consecutive duplicate goals', () => {
    const run = createRun([
      'SAFE_OPENING',
      'SAFE_OPENING',
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'EMOTION_NAMING',
    ]);

    assert.deepEqual(extractActualGoalPath(run), ['SAFE_OPENING', 'EMOTION_NAMING']);
    assert.deepEqual(collapseConsecutiveGoals([
      'SAFE_OPENING',
      'SAFE_OPENING',
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'EMOTION_NAMING',
    ]), ['SAFE_OPENING', 'EMOTION_NAMING']);
  });
});

describe('evaluateGoalProgression', () => {
  it('exactMatch is true when expected equals actual', () => {
    const expected: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'NEED_NAMING',
    ];
    const run = createRun(expected);
    const conversation = createConversation(expected);
    const evaluation = evaluateGoalProgression(run, conversation);

    assert.equal(evaluation.exactMatch, true);
    assert.deepEqual(evaluation.expectedGoalPath, expected);
    assert.deepEqual(evaluation.actualGoalPath, expected);
    assert.equal(evaluation.matchedPrefixLength, expected.length);
    assert.deepEqual(evaluation.completedExpectedGoals, expected);
    assert.deepEqual(evaluation.missingGoals, []);
    assert.deepEqual(evaluation.unexpectedGoals, []);
  });

  it('detects missing goals', () => {
    const expected: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'NEED_NAMING',
      'AGREEMENT',
    ];
    const actual: TherapeuticGoal[] = ['SAFE_OPENING', 'EMOTION_NAMING'];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateGoalProgression(run, conversation);

    assert.equal(evaluation.exactMatch, false);
    assert.deepEqual(evaluation.missingGoals, ['NEED_NAMING', 'AGREEMENT']);
    assert.deepEqual(evaluation.completedExpectedGoals, ['SAFE_OPENING', 'EMOTION_NAMING']);
  });

  it('detects unexpected goals', () => {
    const expected: TherapeuticGoal[] = ['SAFE_OPENING', 'EMOTION_NAMING'];
    const actual: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'REFRAME',
      'CLOSURE',
    ];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateGoalProgression(run, conversation);

    assert.equal(evaluation.exactMatch, false);
    assert.deepEqual(evaluation.unexpectedGoals, ['REFRAME', 'CLOSURE']);
    assert.deepEqual(evaluation.missingGoals, []);
  });

  it('uses expectedReplayGoalPath when present', () => {
    const fullExpected: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'NEED_NAMING',
      'AGREEMENT',
    ];
    const replayExpected: TherapeuticGoal[] = ['SAFE_OPENING'];
    const actual: TherapeuticGoal[] = ['SAFE_OPENING'];
    const run = createRun(actual);
    const conversation: GoldenConversation = {
      ...createConversation(fullExpected),
      expectedReplayGoalPath: replayExpected,
    };
    const evaluation = evaluateGoalProgression(run, conversation);

    assert.ok(fullExpected.length > replayExpected.length);
    assert.equal(evaluation.exactMatch, true);
    assert.deepEqual(evaluation.expectedGoalPath, replayExpected);
    assert.deepEqual(evaluation.actualGoalPath, replayExpected);
    assert.deepEqual(evaluation.missingGoals, []);
    assert.deepEqual(evaluation.unexpectedGoals, []);
  });

  it('computes partial prefix match', () => {
    const expected: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'NEED_NAMING',
      'AGREEMENT',
    ];
    const actual: TherapeuticGoal[] = [
      'SAFE_OPENING',
      'EMOTION_NAMING',
      'PERSPECTIVE_SHARING',
    ];
    const run = createRun(actual);
    const conversation = createConversation(expected);
    const evaluation = evaluateGoalProgression(run, conversation);

    assert.equal(evaluation.exactMatch, false);
    assert.equal(evaluation.matchedPrefixLength, 2);
    assert.deepEqual(evaluation.completedExpectedGoals, ['SAFE_OPENING', 'EMOTION_NAMING']);
    assert.deepEqual(evaluation.missingGoals, ['NEED_NAMING', 'AGREEMENT']);
    assert.deepEqual(evaluation.unexpectedGoals, ['PERSPECTIVE_SHARING']);
  });
});
