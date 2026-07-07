/**
 * Goal Progress Memory — unit tests (Phase 3C).
 *
 *   npm run test:mediator:memory
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  GoalContinuityContext,
  GoalState,
  SessionMemory,
  TherapeuticGoal,
} from '@/types/mediator';
import { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity';
import { normalizeMemory } from '@/services/mediatorEngine/memory/lib/normalizeMemory';
import { updateSessionMemory } from '@/services/mediatorEngine/memory/updateSessionMemory';
import {
  createBaselineMediationState,
  createBaselineSessionMemory,
  createSessionMemoryUpdateInput,
  TIMESTAMP,
} from '@/services/mediatorEngine/__tests__/memory/fixtures';

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
    suggestedStayReason: 'Continue current therapeutic stage',
    suggestedAdvanceReason: null,
    goalContinuityHint: null,
    confidence: 0,
    ...overrides,
  };
}

function completedGoalState(goal: TherapeuticGoal): GoalState {
  return {
    goal,
    status: 'completed',
    checks: [],
    progressPercent: 100,
    startedAt: TIMESTAMP,
    completedAt: TIMESTAMP,
    attemptCount: 1,
  };
}

describe('Phase 3C — persist goal progress', () => {
  it('merges completedGoals from state and goalContinuityContext', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({
          goals: [completedGoalState('SAFE_OPENING')],
        }),
        goalContinuityContext: createGoalContinuityContext({
          completedGoals: ['EMOTION_NAMING'],
        }),
      })
    );

    assert.deepEqual(result.completedGoals, ['SAFE_OPENING', 'EMOTION_NAMING']);
  });

  it('deduplicates completedGoals across state and goalContinuityContext', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({
          goals: [completedGoalState('SAFE_OPENING')],
        }),
        goalContinuityContext: createGoalContinuityContext({
          completedGoals: ['SAFE_OPENING', 'EMOTION_NAMING'],
        }),
      })
    );

    assert.deepEqual(result.completedGoals, ['SAFE_OPENING', 'EMOTION_NAMING']);
  });

  it('records advance transitions in goalTransitionHistory', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 4,
        state: createBaselineMediationState({
          meta: {
            schemaVersion: '2.3',
            sessionId: 'test-session',
            mediationId: 'test-mediation',
            language: 'en',
            startedAt: TIMESTAMP,
            lastUpdatedAt: TIMESTAMP,
            currentTurnNumber: 4,
          },
        }),
        goalTransition: 'advance',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'SAFE_OPENING',
          recommendedNextGoal: 'EMOTION_NAMING',
          completionReason: 'Opening phase complete with safety clear and forward movement',
        }),
      })
    );

    assert.equal(result.goalTransitionHistory.length, 1);
    assert.deepEqual(result.goalTransitionHistory[0], {
      fromGoal: 'SAFE_OPENING',
      toGoal: 'EMOTION_NAMING',
      direction: 'advance',
      turnNumber: 4,
      timestamp: TIMESTAMP,
      reason: 'Opening phase complete with safety clear and forward movement',
      triggeredBy: 'decision_engine',
    });
  });

  it('records regress transitions in goalTransitionHistory', () => {
    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 6,
        goalTransition: 'regress',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'PERSPECTIVE_SHARING',
          recommendedNextGoal: 'REFRAME',
          suggestedStayReason: 'Mutual understanding is still low',
        }),
      })
    );

    assert.equal(result.goalTransitionHistory.length, 1);
    assert.equal(result.goalTransitionHistory[0]?.direction, 'regress');
    assert.equal(result.goalTransitionHistory[0]?.fromGoal, 'PERSPECTIVE_SHARING');
    assert.equal(result.goalTransitionHistory[0]?.toGoal, 'REFRAME');
  });

  it('does not record goalTransitionHistory when goalTransition is stay', () => {
    const previousMemory = createBaselineSessionMemory({
      goalTransitionHistory: [
        {
          fromGoal: 'SAFE_OPENING',
          toGoal: 'EMOTION_NAMING',
          direction: 'advance',
          turnNumber: 2,
          timestamp: TIMESTAMP,
          reason: 'Prior advance',
          triggeredBy: 'decision_engine',
        },
      ],
      lastGoalTransitionReason: 'Prior advance',
    });

    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        previousMemory,
        goalTransition: 'stay',
        goalContinuityContext: createGoalContinuityContext({
          suggestedAdvanceReason: 'Should not be recorded as transition',
        }),
      })
    );

    assert.equal(result.goalTransitionHistory.length, 1);
    assert.equal(result.lastGoalTransitionReason, 'Prior advance');
  });

  it('sets lastGoalTransitionReason using completion, advance, then stay priority', () => {
    const withCompletion = updateSessionMemory(
      createSessionMemoryUpdateInput({
        goalTransition: 'advance',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'SAFE_OPENING',
          recommendedNextGoal: 'EMOTION_NAMING',
          completionReason: 'Completion reason wins',
          suggestedAdvanceReason: 'Advance reason',
          suggestedStayReason: 'Stay reason',
        }),
      })
    );
    assert.equal(withCompletion.lastGoalTransitionReason, 'Completion reason wins');

    const withAdvanceOnly = updateSessionMemory(
      createSessionMemoryUpdateInput({
        goalTransition: 'advance',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'SAFE_OPENING',
          recommendedNextGoal: 'EMOTION_NAMING',
          completionReason: null,
          suggestedAdvanceReason: 'Advance reason wins',
          suggestedStayReason: 'Stay reason',
        }),
      })
    );
    assert.equal(withAdvanceOnly.lastGoalTransitionReason, 'Advance reason wins');

    const withStayOnly = updateSessionMemory(
      createSessionMemoryUpdateInput({
        goalTransition: 'regress',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'PERSPECTIVE_SHARING',
          recommendedNextGoal: 'REFRAME',
          completionReason: null,
          suggestedAdvanceReason: null,
          suggestedStayReason: 'Stay reason wins',
        }),
      })
    );
    assert.equal(withStayOnly.lastGoalTransitionReason, 'Stay reason wins');
  });

  it('does not crash on partial session memory with new goal progress fields', () => {
    assert.doesNotThrow(() => {
      const result = updateSessionMemory(
        createSessionMemoryUpdateInput({
          previousMemory: {
            goalTransitionHistory: 'invalid',
            lastGoalTransitionReason: 42,
          } as unknown as SessionMemory,
          goalTransition: 'advance',
          goalContinuityContext: createGoalContinuityContext({
            currentGoal: 'SAFE_OPENING',
            recommendedNextGoal: 'EMOTION_NAMING',
          }),
        })
      );

      assert.ok(Array.isArray(result.goalTransitionHistory));
      assert.equal(result.goalTransitionHistory.length, 1);
      assert.equal(typeof result.lastGoalTransitionReason, 'string');
    });
  });

  it('normalizeMemory preserves backward compatibility for legacy memory payloads', () => {
    const legacy = normalizeMemory({
      completedGoals: ['SAFE_OPENING'],
      regressHistory: [],
    } as Partial<SessionMemory>);

    assert.deepEqual(legacy.completedGoals, ['SAFE_OPENING']);
    assert.deepEqual(legacy.goalTransitionHistory, []);
    assert.equal(legacy.lastGoalTransitionReason, null);
  });

  it('does not store transcript or PII in serialized goal progress memory', () => {
    const privateText = '__PRIVATE_PARTNER_MESSAGE_ABOUT_SECRET_ACCOUNT__';

    const result = updateSessionMemory(
      createSessionMemoryUpdateInput({
        state: createBaselineMediationState({
          conflict: {
            surfaceTopic: privateText,
            surfaceTopicConfidence: 90,
            hypothesizedDeepThemes: [],
            confirmedDeepTheme: privateText,
            conflictSummary: privateText,
            preAnalysisContext: {
              hostEmotions: [],
              hostNeeds: [],
              partnerEmotions: [],
              partnerNeeds: [],
              keyTrigger: privateText,
            },
          },
        }),
        goalTransition: 'advance',
        goalContinuityContext: createGoalContinuityContext({
          currentGoal: 'SAFE_OPENING',
          recommendedNextGoal: 'EMOTION_NAMING',
          completionReason: 'Opening phase complete with safety clear and forward movement',
        }),
      })
    );

    const serialized = JSON.stringify({
      completedGoals: result.completedGoals,
      goalTransitionHistory: result.goalTransitionHistory,
      lastGoalTransitionReason: result.lastGoalTransitionReason,
    });
    assert.ok(!serialized.includes(privateText));
    assert.ok(!serialized.includes('transcript'));
    assert.ok(!serialized.includes('primaryMessage'));
    assert.ok(!serialized.includes('goalContinuityHint'));
    assert.ok(!serialized.includes('recentlyCompletedGoals'));
  });

  it('carries completedGoals from a prior turn into the next turn', () => {
    const turnOneMemory = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 3,
        goalContinuityContext: createGoalContinuityContext({
          completedGoals: ['SAFE_OPENING'],
        }),
      })
    );

    const turnTwoContext = buildGoalContinuityContext({
      state: createBaselineMediationState({
        currentGoal: 'EMOTION_NAMING',
      }),
      sessionMemory: turnOneMemory,
      turnNumber: 4,
    });

    assert.ok(turnTwoContext.completedGoals.includes('SAFE_OPENING'));

    const turnTwoMemory = updateSessionMemory(
      createSessionMemoryUpdateInput({
        turnNumber: 4,
        previousMemory: turnOneMemory,
        state: createBaselineMediationState({
          currentGoal: 'EMOTION_NAMING',
        }),
        goalContinuityContext: turnTwoContext,
      })
    );

    assert.ok(turnTwoMemory.completedGoals.includes('SAFE_OPENING'));
  });
});
