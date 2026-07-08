/**
 * Intervention Evaluation — unit tests (Phase 4G).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/interventionEvaluation.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import {
  dedupePreservingOrder,
  evaluateInterventions,
  extractActualInterventions,
} from '@/services/mediatorEngine/evaluation/intervention';
import type { InterventionType } from '@/types/mediator/engineTypes';

function createRun(interventionTypes: InterventionType[]): ConversationRunResult {
  const turns: TurnTrace[] = interventionTypes.map((interventionType, index) => ({
    turnNumber: index + 1,
    speaker: index % 2 === 0 ? 'host' : 'partner',
    inputMessage: `message-${index + 1}`,
    currentGoal: 'SAFE_OPENING',
    strategy: 'validate_emotions',
    interventionType,
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

describe('extractActualInterventions', () => {
  it('removes duplicate interventions while preserving first occurrence order', () => {
    const run = createRun(['validate', 'validate', 'reflect', 'reflect', 'mirror']);

    assert.deepEqual(extractActualInterventions(run), ['validate', 'reflect', 'mirror']);
    assert.deepEqual(
      dedupePreservingOrder(['validate', 'validate', 'reflect', 'reflect', 'mirror']),
      ['validate', 'reflect', 'mirror']
    );
  });
});

describe('evaluateInterventions', () => {
  it('exactMatch is true when expected equals actual after deduplication', () => {
    const expected: InterventionType[] = ['validate', 'reflect', 'mirror'];
    const run = createRun(expected);
    const evaluation = evaluateInterventions(run, expected);

    assert.equal(evaluation.exactMatch, true);
    assert.deepEqual(evaluation.expectedInterventions, expected);
    assert.deepEqual(evaluation.actualInterventions, expected);
    assert.deepEqual(evaluation.matchedInterventions, expected);
    assert.deepEqual(evaluation.missingInterventions, []);
    assert.deepEqual(evaluation.unexpectedInterventions, []);
    assert.equal(evaluation.coverage, 1);
  });

  it('computes coverage for partial match', () => {
    const expected: InterventionType[] = ['validate', 'reflect', 'mirror', 'reframe'];
    const actual: InterventionType[] = ['validate', 'reflect'];
    const run = createRun(actual);
    const evaluation = evaluateInterventions(run, expected);

    assert.equal(evaluation.exactMatch, false);
    assert.equal(evaluation.coverage, 0.5);
    assert.deepEqual(evaluation.matchedInterventions, ['validate', 'reflect']);
  });

  it('detects missing interventions', () => {
    const expected: InterventionType[] = ['validate', 'reflect', 'mirror'];
    const actual: InterventionType[] = ['validate'];
    const run = createRun(actual);
    const evaluation = evaluateInterventions(run, expected);

    assert.deepEqual(evaluation.missingInterventions, ['reflect', 'mirror']);
    assert.equal(evaluation.coverage, 1 / 3);
  });

  it('detects unexpected interventions', () => {
    const expected: InterventionType[] = ['validate', 'reflect'];
    const actual: InterventionType[] = ['validate', 'reflect', 'mirror', 'pause'];
    const run = createRun(actual);
    const evaluation = evaluateInterventions(run, expected);

    assert.deepEqual(evaluation.unexpectedInterventions, ['mirror', 'pause']);
    assert.deepEqual(evaluation.missingInterventions, []);
    assert.equal(evaluation.coverage, 1);
  });
});
