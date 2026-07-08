/**
 * Golden Conversation Text Viewer — unit tests (Phase 4C).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/conversationViewer.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import { formatConversationTrace } from '@/services/mediatorEngine/evaluation/viewer';

function createConversation(overrides: Partial<GoldenConversation> = {}): GoldenConversation {
  return {
    id: 'finances-blame',
    title: 'Finanse — wzajemne obwinianie',
    description: 'Test',
    difficulty: 'medium',
    tags: [],
    expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING'],
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
    ...overrides,
  };
}

function createTurn(overrides: Partial<TurnTrace> & Pick<TurnTrace, 'turnNumber'>): TurnTrace {
  return {
    speaker: overrides.turnNumber % 2 === 1 ? 'host' : 'partner',
    inputMessage: `Input message ${overrides.turnNumber}`,
    currentGoal: 'SAFE_OPENING',
    strategy: 'validate_emotions',
    interventionType: 'validate',
    goalTransition: 'stay',
    sessionMemory: {} as TurnTrace['sessionMemory'],
    mediationState: {} as TurnTrace['mediationState'],
    finalMediatorMessage: {
      text: `Mediator reply ${overrides.turnNumber}`,
      source: 'stub',
      safetyLevel: 'none',
      language: 'pl',
      turnNumber: overrides.turnNumber,
      accepted: true,
      validationAction: 'accept',
    },
    safetyLevel: 'none',
    compliance: {
      compliant: true,
      violations: [],
      attemptNumber: 1,
      fallbackUsed: false,
      validatedAt: '2026-07-08T00:00:00.000Z',
      validatorLayer: 'deterministic',
    },
    ...overrides,
  };
}

function createGoalEvaluation(
  overrides: Partial<GoalProgressionEvaluation> = {}
): GoalProgressionEvaluation {
  return {
    expectedGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING', 'NEED_NAMING'],
    actualGoalPath: ['SAFE_OPENING', 'EMOTION_NAMING'],
    matchedPrefixLength: 2,
    completedExpectedGoals: ['SAFE_OPENING', 'EMOTION_NAMING'],
    missingGoals: ['NEED_NAMING'],
    unexpectedGoals: [],
    exactMatch: false,
    ...overrides,
  };
}

describe('formatConversationTrace', () => {
  it('renders PASS run', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: 2,
      turns: [createTurn({ turnNumber: 1 }), createTurn({ turnNumber: 2 })],
    };

    const output = formatConversationTrace(conversation, run);

    assert.match(output, /# Golden Conversation: finances-blame/);
    assert.match(output, /Status: PASS/);
    assert.match(output, /Turns: 2/);
    assert.match(output, /## Turn 1/);
    assert.match(output, /## Turn 2/);
  });

  it('renders SKIPPED run with reason', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'SKIPPED',
      skipReason: 'messages_missing',
      executedTurns: 0,
      turns: [],
    };

    const output = formatConversationTrace(conversation, run);

    assert.match(output, /Status: SKIPPED/);
    assert.match(output, /Reason:\nmessages_missing/);
    assert.doesNotMatch(output, /## Turn/);
    assert.doesNotMatch(output, /## Goal Progression/);
  });

  it('renders FAILED run with failureReason', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'FAILED',
      failureReason: 'runtime error',
      executedTurns: 1,
      turns: [createTurn({ turnNumber: 1 })],
    };

    const output = formatConversationTrace(conversation, run);

    assert.match(output, /Status: FAILED/);
    assert.match(output, /Failure:\nruntime error/);
    assert.match(output, /## Turn 1/);
  });

  it('includes goal progression when provided', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: 1,
      turns: [createTurn({ turnNumber: 1 })],
    };
    const goalEvaluation = createGoalEvaluation();

    const output = formatConversationTrace(conversation, run, goalEvaluation);

    assert.match(output, /## Goal Progression/);
    assert.match(output, /SAFE_OPENING → EMOTION_NAMING → NEED_NAMING/);
    assert.match(output, /Actual:\nSAFE_OPENING → EMOTION_NAMING/);
    assert.match(output, /Matched prefix: 2/);
    assert.match(output, /Exact match: false/);
    assert.match(output, /Missing:\nNEED_NAMING/);
  });

  it('includes every turn', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: 3,
      turns: [
        createTurn({
          turnNumber: 1,
          speaker: 'host',
          inputMessage: 'Ja już nie wiem...',
        }),
        createTurn({
          turnNumber: 2,
          speaker: 'partner',
          inputMessage: 'Bo mam wrażenie...',
        }),
        createTurn({
          turnNumber: 3,
          speaker: 'host',
          inputMessage: 'Mnie nie chodzi...',
        }),
      ],
    };

    const output = formatConversationTrace(conversation, run);

    assert.match(output, /## Turn 1/);
    assert.match(output, /## Turn 2/);
    assert.match(output, /## Turn 3/);
    assert.match(output, /"Ja już nie wiem..."/);
    assert.match(output, /"Bo mam wrażenie..."/);
    assert.match(output, /"Mnie nie chodzi..."/);
    assert.match(output, /Speaker:\nhost/);
    assert.match(output, /Speaker:\npartner/);
  });

  it('does not throw on empty turns', () => {
    const conversation = createConversation();
    const run: ConversationRunResult = {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: 0,
      turns: [],
    };

    assert.doesNotThrow(() => formatConversationTrace(conversation, run));
    const output = formatConversationTrace(conversation, run);
    assert.match(output, /Turns: 0/);
    assert.doesNotMatch(output, /## Turn/);
  });
});
