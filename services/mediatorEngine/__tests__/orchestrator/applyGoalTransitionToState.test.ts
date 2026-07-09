/**
 * applyGoalTransitionToState — unit tests (Phase 5H).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/orchestrator/applyGoalTransitionToState.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEmptyMediationState } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { applyGoalTransitionToState } from '@/services/mediatorEngine/orchestrator/applyGoalTransitionToState';
import type { GoalContinuityContext } from '@/types/mediator/goalContinuity';

const EMPTY_REQUEST = {
  mediationId: 'test',
  sessionId: 'test',
  trigger: 'session_start' as const,
  turnNumber: 1,
  mediationState: null,
  transcriptDelta: [],
  engineVersion: 'v2.3' as const,
};

function createGoalContinuityContext(
  overrides: Partial<GoalContinuityContext> = {}
): GoalContinuityContext {
  return {
    currentGoal: 'SAFE_OPENING',
    completedGoals: [],
    recentlyCompletedGoals: [],
    activeGoalTurnCount: 1,
    repeatedGoalDetected: false,
    repeatedGoalReason: null,
    goalStagnationDetected: false,
    goalStagnationReason: null,
    completionDetected: false,
    completionReason: null,
    recommendedGoalTransition: 'stay',
    recommendedNextGoal: null,
    suggestedStayReason: null,
    suggestedAdvanceReason: null,
    goalContinuityHint: null,
    confidence: 0,
    ...overrides,
  };
}

describe('applyGoalTransitionToState', () => {
  it('keeps currentGoal on stay', () => {
    const state = createEmptyMediationState(EMPTY_REQUEST);

    const result = applyGoalTransitionToState({
      state,
      goalTransition: 'stay',
      goalContinuityContext: createGoalContinuityContext({
        recommendedNextGoal: 'EMOTION_NAMING',
      }),
    });

    assert.equal(result.currentGoal, 'SAFE_OPENING');
    assert.equal(result, state);
  });

  it('advances currentGoal when decision is advance and recommendedNextGoal exists', () => {
    const state = createEmptyMediationState(EMPTY_REQUEST);

    const result = applyGoalTransitionToState({
      state,
      goalTransition: 'advance',
      goalContinuityContext: createGoalContinuityContext({
        recommendedNextGoal: 'EMOTION_NAMING',
      }),
    });

    assert.equal(result.currentGoal, 'EMOTION_NAMING');
    assert.notEqual(result, state);
    assert.equal(state.currentGoal, 'SAFE_OPENING');
  });

  it('regresses currentGoal when decision is regress and recommendedNextGoal exists', () => {
    const state = createEmptyMediationState({
      ...EMPTY_REQUEST,
      turnNumber: 3,
    });
    state.currentGoal = 'PERSPECTIVE_SHARING';

    const result = applyGoalTransitionToState({
      state,
      goalTransition: 'regress',
      goalContinuityContext: createGoalContinuityContext({
        currentGoal: 'PERSPECTIVE_SHARING',
        recommendedNextGoal: 'REFRAME',
      }),
    });

    assert.equal(result.currentGoal, 'REFRAME');
    assert.equal(state.currentGoal, 'PERSPECTIVE_SHARING');
  });

  it('does not change currentGoal when recommendedNextGoal is missing', () => {
    const state = createEmptyMediationState(EMPTY_REQUEST);

    const result = applyGoalTransitionToState({
      state,
      goalTransition: 'advance',
      goalContinuityContext: createGoalContinuityContext({
        recommendedNextGoal: null,
      }),
    });

    assert.equal(result.currentGoal, 'SAFE_OPENING');
    assert.equal(result, state);
  });
});
