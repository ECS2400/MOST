/**
 * Adaptive Goal Selection — unit tests (Phase 3D core).
 *
 *   npm run test:mediator:strategy
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoalTransition, TherapeuticGoal } from '@/types/mediator';
import { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity';
import {
  buildGoalCandidateSet,
  chooseAdaptiveNextGoal,
} from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection';
import { nextGoalInFlow } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import type { AdaptiveGoalSelectionInput } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';
import { createBaselineSessionMemory } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import {
  createEmptyReflectionOutput,
  skeletonConfidence,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

function baseInput(
  overrides: Partial<AdaptiveGoalSelectionInput> = {}
): AdaptiveGoalSelectionInput {
  return {
    currentGoal: 'EMOTION_NAMING',
    completedGoals: [],
    mutualUnderstandingScore: 0,
    completionDetected: false,
    goalStagnationDetected: false,
    safety: null,
    bothReady: false,
    acceptedByBoth: false,
    goalTransitionHistory: [],
    turnNumber: 3,
    ...overrides,
  };
}

function transition(
  direction: GoalTransition['direction'],
  turnNumber: number,
  fromGoal: TherapeuticGoal,
  toGoal: TherapeuticGoal
): GoalTransition {
  return {
    fromGoal,
    toGoal,
    direction,
    turnNumber,
    timestamp: '2026-07-05T00:00:00.000Z',
    reason: 'test transition',
    triggeredBy: 'decision_engine',
  };
}

describe('Phase 3D core — adaptive goal selection', () => {
  it('1. fallback uses nextGoalInFlow when signals are weak', () => {
    const input = baseInput({ currentGoal: 'SAFE_OPENING' });
    const fallback = nextGoalInFlow('SAFE_OPENING');

    assert.equal(chooseAdaptiveNextGoal(input, fallback), 'EMOTION_NAMING');
  });

  it('2. adaptive wins with a strong fast-track signal', () => {
    const input = baseInput({
      currentGoal: 'AGREEMENT',
      completedGoals: ['AGREEMENT'],
      completionDetected: true,
      acceptedByBoth: true,
    });

    assert.equal(chooseAdaptiveNextGoal(input, 'FUTURE_PLAN'), 'CLOSURE');
  });

  it('3. baseline wins with a weak signal', () => {
    const input = baseInput({
      currentGoal: 'EMOTION_NAMING',
      completionDetected: true,
      goalStagnationDetected: false,
    });

    assert.equal(chooseAdaptiveNextGoal(input, 'EMOTION_UNDERSTANDING'), 'EMOTION_UNDERSTANDING');
  });

  it('4. safety blocks adaptive selection', () => {
    const input = baseInput({
      currentGoal: 'AGREEMENT',
      acceptedByBoth: true,
      completionDetected: true,
      safety: {
        level: 'L2_pause',
        preempted: true,
        signals: [],
        recommendedInterventionType: 'invite_pause_and_breathe',
        blockGoalTransitions: true,
        blockStandardInterventions: false,
        allowedInterventionTypes: [],
        assessed: skeletonConfidence(true),
      },
    });

    assert.equal(chooseAdaptiveNextGoal(input, 'FUTURE_PLAN'), 'FUTURE_PLAN');
  });

  it('5. recent regress cooldown blocks adaptive skip', () => {
    const input = baseInput({
      currentGoal: 'EMOTION_NAMING',
      completionDetected: true,
      bothReady: true,
      goalStagnationDetected: true,
      turnNumber: 6,
      goalTransitionHistory: [
        transition('regress', 5, 'NEED_NAMING', 'EMOTION_NAMING'),
      ],
    });

    assert.equal(chooseAdaptiveNextGoal(input, 'EMOTION_UNDERSTANDING'), 'EMOTION_UNDERSTANDING');
  });

  it('6. completed goal filter blocks regress candidate', () => {
    const candidates = buildGoalCandidateSet(
      baseInput({
        currentGoal: 'EMOTION_UNDERSTANDING',
        completedGoals: ['EMOTION_NAMING'],
        goalStagnationDetected: true,
      })
    );

    assert.ok(!candidates.some((candidate) => candidate.kind === 'regress'));
  });

  it('7. ping-pong protection blocks non-baseline candidates', () => {
    const candidates = buildGoalCandidateSet(
      baseInput({
        currentGoal: 'EMOTION_NAMING',
        acceptedByBoth: true,
        completionDetected: true,
        goalTransitionHistory: [
          transition('regress', 4, 'NEED_NAMING', 'EMOTION_NAMING'),
          transition('advance', 5, 'EMOTION_NAMING', 'NEED_NAMING'),
        ],
      })
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.kind),
      ['baseline']
    );
  });

  it('8. skip candidate never exceeds max distance of 2', () => {
    const candidates = buildGoalCandidateSet(baseInput({ currentGoal: 'SAFE_OPENING' }));
    const skip = candidates.find((candidate) => candidate.kind === 'skip');

    assert.equal(skip?.goal, 'EMOTION_UNDERSTANDING');
    assert.ok(!candidates.some((candidate) => candidate.goal === 'NEED_NAMING'));
  });

  it('9. malformed input does not throw', () => {
    assert.doesNotThrow(() => {
      assert.equal(chooseAdaptiveNextGoal(null, 'EMOTION_NAMING'), 'EMOTION_NAMING');
      assert.equal(chooseAdaptiveNextGoal(undefined, null), null);
      assert.doesNotThrow(() => buildGoalCandidateSet(baseInput({ goalTransitionHistory: 'bad' as never })));
    });
  });

  it('10. backward compatibility keeps baseline SAFE_OPENING advance', () => {
    const moved = skeletonConfidence(true);
    moved.confidence = 80;

    const result = buildGoalContinuityContext({
      state: createBaselineMediationState({ currentGoal: 'SAFE_OPENING' }),
      sessionMemory: createBaselineSessionMemory(),
      reflection: {
        ...createEmptyReflectionOutput(),
        conversationMovedForward: moved,
        expectedEffectEvaluation: {
          effectId: 'effect-1',
          achieved: true,
          confidence: 75,
          evidence: ['turn-2'],
          partial: false,
        },
      },
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    assert.equal(result.recommendedNextGoal, 'EMOTION_NAMING');
    assert.equal(result.recommendedGoalTransition, 'advance');
  });
});
