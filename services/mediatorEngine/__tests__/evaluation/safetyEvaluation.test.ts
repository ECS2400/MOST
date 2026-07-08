/**
 * Safety Evaluation — unit tests (Phase 4H).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/safetyEvaluation.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import {
  evaluateSafety,
  extractObservedSafety,
} from '@/services/mediatorEngine/evaluation/safety';
import type { SafetyLevel } from '@/types/mediator';

function createRun(safetyLevels: SafetyLevel[]): ConversationRunResult {
  const turns: TurnTrace[] = safetyLevels.map((safetyLevel, index) => ({
    turnNumber: index + 1,
    speaker: index % 2 === 0 ? 'host' : 'partner',
    inputMessage: `message-${index + 1}`,
    currentGoal: 'SAFE_OPENING',
    strategy: 'validate_emotions',
    interventionType: 'validate',
    goalTransition: 'stay',
    sessionMemory: {} as TurnTrace['sessionMemory'],
    mediationState: {} as TurnTrace['mediationState'],
    finalMediatorMessage: {} as TurnTrace['finalMediatorMessage'],
    safetyLevel,
    compliance: {} as TurnTrace['compliance'],
  }));

  return {
    conversationId: 'test-conversation',
    status: 'PASS',
    executedTurns: turns.length,
    turns,
  };
}

function createConversation(
  safetyExpectation: GoldenConversation['safetyExpectation']
): GoldenConversation {
  return {
    id: 'test-conversation',
    title: 'Test',
    description: 'Test',
    difficulty: 'low',
    tags: [],
    expectedGoalPath: ['SAFE_OPENING'],
    expectedStrategies: [],
    safetyExpectation,
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

describe('extractObservedSafety', () => {
  it('returns the highest observed safety level', () => {
    const run = createRun(['none', 'L1_gentle', 'L2_pause', 'L1_gentle']);

    assert.equal(extractObservedSafety(run), 'L2');
  });
});

describe('evaluateSafety', () => {
  it('none == none', () => {
    const run = createRun(['none', 'none']);
    const evaluation = evaluateSafety(run, createConversation('none'));

    assert.equal(evaluation.exactMatch, true);
    assert.equal(evaluation.isSaferThanExpected, false);
    assert.equal(evaluation.isLessSafeThanExpected, false);
    assert.equal(evaluation.observedSafety, 'none');
    assert.equal(evaluation.expectedSafety, 'none');
  });

  it('L1 == L1', () => {
    const run = createRun(['L1_gentle', 'L1_gentle']);
    const evaluation = evaluateSafety(run, createConversation('L1'));

    assert.equal(evaluation.exactMatch, true);
    assert.equal(evaluation.observedSafety, 'L1');
    assert.equal(evaluation.expectedSafety, 'L1');
  });

  it('expected none observed L1', () => {
    const run = createRun(['none', 'L1_gentle']);
    const evaluation = evaluateSafety(run, createConversation('none'));

    assert.equal(evaluation.exactMatch, false);
    assert.equal(evaluation.isSaferThanExpected, true);
    assert.equal(evaluation.isLessSafeThanExpected, false);
    assert.equal(evaluation.observedSafety, 'L1');
  });

  it('expected L2 observed L1', () => {
    const run = createRun(['L1_gentle']);
    const evaluation = evaluateSafety(run, createConversation('L2'));

    assert.equal(evaluation.exactMatch, false);
    assert.equal(evaluation.isSaferThanExpected, false);
    assert.equal(evaluation.isLessSafeThanExpected, true);
    assert.equal(evaluation.observedSafety, 'L1');
    assert.equal(evaluation.expectedSafety, 'L2');
  });

  it('expected L3 observed L3', () => {
    const run = createRun(['L2_pause', 'L3_stop']);
    const evaluation = evaluateSafety(run, createConversation('L3'));

    assert.equal(evaluation.exactMatch, true);
    assert.equal(evaluation.observedSafety, 'L3');
    assert.equal(evaluation.expectedSafety, 'L3');
  });
});
