/**
 * Goal Continuity Engine — unit tests (Phase 3B).
 *
 *   npm run test:mediator:strategy
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MediationState, SessionMemory, TherapeuticGoal } from '@/types/mediator';
import { buildGoalContinuityContext } from '@/services/mediatorEngine/goalContinuity';
import { dedupeGoals } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { makeDecision } from '@/services/mediatorEngine/decision/makeDecision';
import { selectStrategy } from '@/services/mediatorEngine/strategy/selectStrategy';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import {
  createBaselinePriorityOutput,
  createBaselineStrategyOutput,
  createDecisionInput,
} from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createBaselineSessionMemory } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import { createPromptComposerInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import { createPreemptiveSafetyOutput } from '@/services/mediatorEngine/__tests__/priority/fixtures';
import {
  createStrategyInput,
  withBothReady,
  withSafety,
} from '@/services/mediatorEngine/__tests__/strategy/fixtures';
import { createRuntimeInput } from '@/services/mediatorEngine/__tests__/runtime/fixtures';
import {
  createEmptyReflectionOutput,
  skeletonConfidence,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

function movedForwardReflection() {
  const moved = skeletonConfidence(true);
  moved.confidence = 80;
  const effect = {
    effectId: 'effect-1',
    achieved: true,
    confidence: 75,
    evidence: ['turn-2'],
    partial: false,
  };
  return {
    ...createEmptyReflectionOutput(),
    conversationMovedForward: moved,
    expectedEffectEvaluation: effect,
    lastInterventionHelpful: skeletonConfidence(true),
  };
}

function stateWithGoal(
  goal: TherapeuticGoal,
  overrides: Partial<MediationState> = {}
): MediationState {
  return createBaselineMediationState({
    currentGoal: goal,
    ...overrides,
  });
}

function memoryWithGoalTurns(goal: TherapeuticGoal, count: number): SessionMemory {
  const history = Array.from({ length: count }, (_, i) => ({
    interventionId: `int-${i}`,
    turnNumber: i + 1,
    type: 'reflect' as const,
    goal,
    intent: 'increase_emotional_safety' as const,
    strategy: 'validate_emotions' as const,
    expectedEffectId: 'effect-1',
    signature: `reflect:${goal}:both`,
    compliance: {
      compliant: true,
      violationCount: 0,
      blockingViolationCount: 0,
      fallbackUsed: false,
      attemptNumber: 1,
    },
    effective: false,
    confidence: 60,
  }));
  return createBaselineSessionMemory({
    interventionHistory: history,
    recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
    completedGoals: [],
  });
}

describe('buildGoalContinuityContext — Phase 3B', () => {
  it('1. empty state no throw', () => {
    assert.doesNotThrow(() => {
      const result = buildGoalContinuityContext(null);
      assert.equal(result.currentGoal, 'SAFE_OPENING');
      assert.equal(result.recommendedGoalTransition, 'stay');
    });
  });

  it('2. SAFE_OPENING completion after first compliant turn', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    assert.equal(result.completionDetected, true);
    assert.ok(result.completedGoals.includes('SAFE_OPENING'));
    assert.equal(result.recommendedNextGoal, 'EMOTION_NAMING');
  });

  it('3. acceptedByBoth → AGREEMENT completion', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('AGREEMENT', {
        agreements: {
          sharedRule: null,
          hostCommitment: 'A',
          partnerCommitment: 'B',
          futurePlan: null,
          acceptedByBoth: true,
        },
      }),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 5,
    });

    assert.equal(result.completionDetected, true);
    assert.ok(result.completedGoals.includes('AGREEMENT'));
  });

  it('4. mutualUnderstandingScore high → PERSPECTIVE_SHARING completion', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('PERSPECTIVE_SHARING', {
        dynamics: {
          ...createBaselineMediationState().dynamics,
          mutualUnderstandingScore: 85,
          agreementLevel: 50,
        },
      }),
      sessionMemory: createBaselineSessionMemory(),
      reflection: createEmptyReflectionOutput(),
      safety: null,
      turnNumber: 6,
    });

    assert.equal(result.completionDetected, true);
    assert.ok(result.completionReason?.includes('Mutual understanding'));
  });

  it('5. same goal many turns → stagnation detected', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('NEED_NAMING'),
      sessionMemory: memoryWithGoalTurns('NEED_NAMING', 6),
      reflection: createEmptyReflectionOutput(),
      safety: null,
      turnNumber: 7,
    });

    assert.equal(result.repeatedGoalDetected, true);
    assert.equal(result.goalStagnationDetected, true);
  });

  it('6. completed goal still current → recommends advance', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory({
        completedGoals: ['SAFE_OPENING'],
      }),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 3,
      lastComplianceCompliant: true,
    });

    assert.equal(result.goalStagnationDetected, true);
    assert.equal(result.recommendedGoalTransition, 'advance');
    assert.equal(result.recommendedNextGoal, 'EMOTION_NAMING');
  });

  it('7. safety active → no forced advance', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory({ completedGoals: ['SAFE_OPENING'] }),
      reflection: movedForwardReflection(),
      safety: createPreemptiveSafetyOutput(),
      turnNumber: 3,
    });

    assert.equal(result.recommendedGoalTransition, 'stay');
    assert.equal(result.suggestedStayReason, 'Safety is active');
  });

  it('15. current goal completed → next goal recommended', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('EMOTION_NAMING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 4,
      lastComplianceCompliant: true,
    });

    assert.equal(result.recommendedGoalTransition, 'advance');
    assert.equal(result.recommendedNextGoal, 'EMOTION_UNDERSTANDING');
  });

  it('16. closure not recommended too early', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: createEmptyReflectionOutput(),
      safety: null,
      turnNumber: 1,
    });

    assert.notEqual(result.recommendedNextGoal, 'CLOSURE');
    assert.notEqual(result.recommendedGoalTransition, 'closure');
  });

  it('17. completedGoals deduped', () => {
    const deduped = dedupeGoals(['SAFE_OPENING', 'SAFE_OPENING', 'EMOTION_NAMING']);
    assert.deepEqual(deduped, ['SAFE_OPENING', 'EMOTION_NAMING']);

    const result = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory({
        completedGoals: ['SAFE_OPENING', 'SAFE_OPENING'],
      }),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });
    assert.equal(
      result.completedGoals.filter((g) => g === 'SAFE_OPENING').length,
      1
    );
  });

  it('18. malformed/partial state no throw', () => {
    assert.doesNotThrow(() => {
      const result = buildGoalContinuityContext({
        state: {} as MediationState,
        sessionMemory: {} as SessionMemory,
        reflection: {} as never,
        safety: null,
        turnNumber: 0,
      });
      assert.ok(typeof result.goalContinuityHint === 'string' || result.goalContinuityHint === null);
    });
  });

  it('13. goal continuity does not serialize transcript', () => {
    const result = buildGoalContinuityContext({
      state: stateWithGoal('NEED_NAMING', {
        conflict: {
          ...createBaselineMediationState().conflict,
          surfaceTopic: 'secret transcript topic content',
        },
      }),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 4,
    });
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('transcript'));
    assert.ok(!serialized.includes('secret transcript topic content'));
  });
});

describe('Goal continuity — strategy/decision/prompt/runtime integration', () => {
  it('9. strategy uses advance recommendation', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    const result = selectStrategy(
      createStrategyInput({
        goalContinuityContext,
        reflection: movedForwardReflection(),
        turnNumber: 2,
      })
    );

    assert.equal(result.suggestedGoalTransition, 'prepare_advance');
  });

  it('8. priority preemption still wins over goal continuity', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ suggestedGoalTransition: 'prepare_advance' }),
        priority: createBaselinePriorityOutput({ preemptsGoalTransition: true }),
        goalContinuityContext,
      })
    );

    assert.equal(result.goalTransition, 'stay');
  });

  it('10. decision uses goal continuity unless preempted', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ suggestedGoalTransition: 'stay' }),
        priority: createBaselinePriorityOutput({ preemptsGoalTransition: false }),
        goalContinuityContext,
      })
    );

    assert.equal(result.goalTransition, 'advance');
  });

  it('7b. safety active blocks strategy advance from goal continuity', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory({ completedGoals: ['SAFE_OPENING'] }),
      reflection: movedForwardReflection(),
      safety: createPreemptiveSafetyOutput(),
      turnNumber: 3,
    });

    const result = selectStrategy(
      createStrategyInput({
        ...withSafety(),
        ...withBothReady(),
        goalContinuityContext,
      })
    );

    assert.equal(result.suggestedGoalTransition, 'stay');
  });

  it('11. prompt contains goal continuity hint', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('SAFE_OPENING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 2,
      lastComplianceCompliant: true,
    });

    const result = composePrompt(
      createPromptComposerInput({ goalContinuityContext })
    );

    assert.match(result.contextSummary, /Goal continuity:/);
    assert.match(result.contextSummary, /EMOTION_NAMING|complete/i);
  });

  it('12. prompt does not contain raw state JSON', () => {
    const goalContinuityContext = buildGoalContinuityContext({
      state: stateWithGoal('NEED_NAMING'),
      sessionMemory: createBaselineSessionMemory(),
      reflection: movedForwardReflection(),
      safety: null,
      turnNumber: 4,
    });

    const result = composePrompt(
      createPromptComposerInput({ goalContinuityContext })
    );
    const text = JSON.stringify(result);
    assert.ok(!text.includes('"mutualUnderstandingScore"'));
    assert.ok(!text.includes('goalContinuityContext'));
    assert.ok(!text.includes('mediationState'));
  });

  it('14. runtime E2E includes goal continuity in prompt context', async () => {
    const result = await runMediatorEngineTurn(
      createRuntimeInput({
        turnInput: {
          ...createRuntimeInput().turnInput,
          turnNumber: 2,
        },
      })
    );

    assert.match(
      result.promptComposerOutput.contextSummary,
      /Goal continuity:|Current goal:/i
    );
  });
});
