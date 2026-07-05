/**
 * Priority Engine L1 — unit tests (Phase 1B).
 *
 *   npm run test:mediator:priority
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePriority } from '@/services/mediatorEngine/priority/resolvePriority';
import {
  assertDisjointInterventionConstraints,
  createBaselineMediationState,
  createBaselineStrategyOutput,
  createPreemptiveSafetyOutput,
  createPriorityInput,
  createReadyReflectionOutput,
} from '@/services/mediatorEngine/__tests__/priority/fixtures';

describe('resolvePriority — L1 deterministic ranking', () => {
  it('safety preempts all other signals', () => {
    const result = resolvePriority(
      createPriorityInput({
        safety: createPreemptiveSafetyOutput(),
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 5,
            blameLoopDetected: true,
            blameLoopCount: 3,
            breakthroughDetected: true,
          },
        }),
      })
    );

    assert.equal(result.activeSignals[0]?.type, 'safety');
    assert.equal(result.conversationMode, 'SAFETY');
    assert.equal(result.recommendedInterventionType, 'safety_response');
    assert.equal(result.preemptsGoalTransition, true);
  });

  it('escalation blocks goal transition', () => {
    const result = resolvePriority(
      createPriorityInput({
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 2,
          },
        }),
      })
    );

    assert.equal(result.activeSignals[0]?.type, 'escalation');
    assert.equal(result.conversationMode, 'DE_ESCALATING');
    assert.equal(result.preemptsGoalTransition, true);
  });

  it('blame loop forces redirect/deescalate recommendations', () => {
    const result = resolvePriority(
      createPriorityInput({
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            blameLoopDetected: true,
            blameLoopCount: 2,
          },
        }),
      })
    );

    assert.equal(result.activeSignals[0]?.type, 'blame_loop');
    assert.equal(result.conversationMode, 'REDIRECTING');
    assert.equal(result.recommendedInterventionType, 'redirect_blame');
    assert.ok(result.allowedInterventionTypes.includes('redirect_blame'));
    assert.ok(result.allowedInterventionTypes.includes('deescalate'));
  });

  it('breakthrough allows consolidate_progress recommendation', () => {
    const result = resolvePriority(
      createPriorityInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'consolidate_progress' }),
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            breakthroughDetected: true,
          },
        }),
      })
    );

    assert.equal(result.activeSignals[0]?.type, 'breakthrough');
    assert.equal(result.conversationMode, 'BREAKTHROUGH');
    assert.equal(result.recommendedInterventionType, 'celebrate_breakthrough');
    assert.equal(result.preemptsGoalTransition, false);
  });

  it('falls back to NORMAL mode when only default strategy signal is active', () => {
    const result = resolvePriority(createPriorityInput());

    const nonDefaultSignals = result.activeSignals.filter(
      (signal) => signal.type !== 'default_strategy'
    );
    assert.equal(nonDefaultSignals.length, 0);
    assert.equal(result.conversationMode, 'NORMAL');
    assert.equal(result.activeSignals.at(-1)?.type, 'default_strategy');
  });

  it('uses StrategyEngineOutput for fallback recommendation', () => {
    const validateResult = resolvePriority(
      createPriorityInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'validate_emotions' }),
      })
    );
    const buildSafetyResult = resolvePriority(
      createPriorityInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'build_safety' }),
      })
    );

    assert.equal(validateResult.recommendedInterventionType, 'validate');
    assert.equal(buildSafetyResult.recommendedInterventionType, 'welcome_open');
  });

  it('does not throw on empty/stub state', () => {
    const malformedState = {} as import('@/types/mediator').MediationState;
    let result;
    assert.doesNotThrow(() => {
      result = resolvePriority({
        state: malformedState,
        reflection: {} as import('@/types/mediator').ReflectionOutput,
        safety: null,
        strategy: createBaselineStrategyOutput(),
        turnNumber: 1,
      });
    });
    assert.ok(result);
    assert.equal(typeof result!.conversationMode, 'string');
    assert.ok(Array.isArray(result!.activeSignals));
    assert.ok(result!.activeSignals.length >= 1);
  });

  it('includes reason and recommendedInterventionType on each signal', () => {
    const result = resolvePriority(
      createPriorityInput({
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 1,
          },
        }),
      })
    );

    for (const signal of result.activeSignals) {
      assert.ok(signal.reason.length > 0);
      assert.ok(typeof signal.recommendedInterventionType === 'string');
    }
  });

  it('ranks readiness below escalation but above default strategy', () => {
    const result = resolvePriority(
      createPriorityInput({
        reflection: createReadyReflectionOutput(),
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 1,
          },
        }),
      })
    );

    const types = result.activeSignals.map((signal) => signal.type);
    assert.equal(types[0], 'escalation');
    assert.ok(types.includes('readiness'));
    assert.ok(types.includes('default_strategy'));
  });

  it('escalation with deepen_emotions removes forbidden types from allowed', () => {
    const escalationForbidden = ['open_deepen', 'choice_emotion', 'choice_need'] as const;
    const result = resolvePriority(
      createPriorityInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'deepen_emotions' }),
        state: createBaselineMediationState({
          dynamics: {
            ...createBaselineMediationState().dynamics,
            escalationDetected: true,
            escalationLevel: 2,
          },
        }),
      })
    );

    assert.equal(result.activeSignals[0]?.type, 'escalation');
    for (const type of escalationForbidden) {
      assert.ok(
        !result.allowedInterventionTypes.includes(type),
        `allowed must not include ${type}`
      );
      assert.ok(
        result.forbiddenInterventionTypes.includes(type),
        `forbidden must include ${type}`
      );
    }
    assertDisjointInterventionConstraints(result);
  });

  it('keeps allowed and forbidden disjoint across priority scenarios', () => {
    const scenarios: Array<{ label: string; input: ReturnType<typeof createPriorityInput> }> = [
      {
        label: 'safety',
        input: createPriorityInput({ safety: createPreemptiveSafetyOutput() }),
      },
      {
        label: 'escalation',
        input: createPriorityInput({
          state: createBaselineMediationState({
            dynamics: {
              ...createBaselineMediationState().dynamics,
              escalationDetected: true,
              escalationLevel: 2,
            },
          }),
        }),
      },
      {
        label: 'blame_loop',
        input: createPriorityInput({
          state: createBaselineMediationState({
            dynamics: {
              ...createBaselineMediationState().dynamics,
              blameLoopDetected: true,
              blameLoopCount: 2,
            },
          }),
        }),
      },
      {
        label: 'breakthrough',
        input: createPriorityInput({
          strategy: createBaselineStrategyOutput({ primaryStrategy: 'consolidate_progress' }),
          state: createBaselineMediationState({
            dynamics: {
              ...createBaselineMediationState().dynamics,
              breakthroughDetected: true,
            },
          }),
        }),
      },
      {
        label: 'default',
        input: createPriorityInput(),
      },
    ];

    for (const { label, input } of scenarios) {
      const result = resolvePriority(input);
      assertDisjointInterventionConstraints(result);
      assert.ok(result.allowedInterventionTypes.length > 0, `${label}: allowed must not be empty`);
    }
  });
});
