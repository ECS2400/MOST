/**
 * Decision Engine L1 — unit tests (Phase 1D).
 *
 *   npm run test:mediator:decision
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DecisionEngineInput, InterventionType, TherapeuticStrategy } from '@/types/mediator';
import { STRATEGY_INTERVENTION_COMPATIBILITY } from '@/services/mediatorEngine/constitution/config/strategyInterventionMap';
import { SAFE_FALLBACK_INTERVENTION_ORDER } from '@/services/mediatorEngine/decision/config/interventionFallbacks';
import { isForbiddenIntervention } from '@/services/mediatorEngine/decision/lib/isForbiddenIntervention';
import { makeDecision } from '@/services/mediatorEngine/decision/makeDecision';
import {
  createBaselinePriorityOutput,
  createBaselineSafetyOutput,
  createBaselineStrategyOutput,
  createDecisionInput,
} from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createBaselineSessionMemory } from '@/services/mediatorEngine/__tests__/memory/fixtures';
import { buildContinuityContext } from '@/services/mediatorEngine/memory/continuity';
import { createPreemptiveSafetyOutput } from '@/services/mediatorEngine/__tests__/priority/fixtures';

describe('makeDecision — L1 deterministic rules', () => {
  it('safety preempts the decision', () => {
    const result = makeDecision(
      createDecisionInput({
        safety: createPreemptiveSafetyOutput(),
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'safety_response',
          allowedInterventionTypes: ['safety_response', 'pause_session', 'deescalate'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
        strategy: createBaselineStrategyOutput({
          primaryStrategy: 'deepen_emotions',
          suggestedGoalTransition: 'prepare_advance',
        }),
      })
    );

    assert.equal(result.selectedInterventionType, 'safety_response');
    assert.equal(result.goalTransition, 'stay');
    assert.equal(result.strategy, 'build_safety');
    assert.ok(
      result.intent === 'invite_pause_and_breathe' ||
        result.intent === 'increase_emotional_safety'
    );
  });

  it('does not select forbidden recommendedInterventionType', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'open_deepen',
          allowedInterventionTypes: ['open_deepen', 'reflect', 'validate', 'deescalate'],
          forbiddenInterventionTypes: ['open_deepen'],
          preemptsGoalTransition: false,
        }),
      })
    );

    assert.notEqual(result.selectedInterventionType, 'open_deepen');
    assert.equal(result.selectedInterventionType, 'reflect');
  });

  it('selects recommended intervention when allowed and not forbidden', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: ['validate', 'reflect', 'deescalate'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: false,
        }),
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'validate_emotions' }),
      })
    );

    assert.equal(result.selectedInterventionType, 'validate');
  });

  it('uses safe fallback when allowedInterventionTypes is empty', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'mirror',
          allowedInterventionTypes: [],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: false,
        }),
      })
    );

    assert.ok(['reflect', 'validate', 'deescalate'].includes(result.selectedInterventionType));
  });

  it('forces stay when priority.preemptsGoalTransition is true', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          preemptsGoalTransition: true,
          recommendedInterventionType: 'deescalate',
          allowedInterventionTypes: ['deescalate', 'reflect'],
          forbiddenInterventionTypes: [],
        }),
        strategy: createBaselineStrategyOutput({ suggestedGoalTransition: 'prepare_advance' }),
      })
    );

    assert.equal(result.goalTransition, 'stay');
  });

  it('uses StrategyEngineOutput.suggestedGoalTransition without preemption', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          preemptsGoalTransition: false,
          conversationMode: 'NORMAL',
          recommendedInterventionType: 'reflect',
          allowedInterventionTypes: ['reflect', 'validate'],
          forbiddenInterventionTypes: [],
        }),
        strategy: createBaselineStrategyOutput({ suggestedGoalTransition: 'prepare_advance' }),
      })
    );

    assert.equal(result.goalTransition, 'advance');
  });

  it('chooses intent deterministically from strategy and intervention type', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: ['validate', 'reflect'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: false,
        }),
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'validate_emotions' }),
      })
    );

    assert.equal(result.selectedInterventionType, 'validate');
    assert.equal(result.intent, 'help_partner_feel_heard');
  });

  it('returns a non-empty technical rationale', () => {
    const result = makeDecision(createDecisionInput());
    assert.ok(typeof result.rationale === 'string');
    assert.ok(result.rationale.length > 0);
    assert.ok(result.rationale.includes('intervention='));
    assert.ok(result.rationale.includes('goal_transition='));
  });

  it('does not crash on partial or malformed input', () => {
    assert.doesNotThrow(() => {
      const result = makeDecision({
        state: {} as DecisionEngineInput['state'],
        reflection: {} as DecisionEngineInput['reflection'],
        strategy: {} as DecisionEngineInput['strategy'],
        priority: {
          allowedInterventionTypes: 'invalid',
          forbiddenInterventionTypes: null,
        } as unknown as DecisionEngineInput['priority'],
        safety: createBaselineSafetyOutput({ preempted: false }),
        turnNumber: 1,
      });
      assert.ok(typeof result.selectedInterventionType === 'string');
      assert.ok(typeof result.rationale === 'string');
    });
  });

  it('never selects a forbidden intervention type', () => {
    const scenarios: Array<{
      label: string;
      input: ReturnType<typeof createDecisionInput>;
    }> = [
      {
        label: 'normal',
        input: createDecisionInput({
          priority: createBaselinePriorityOutput({
            recommendedInterventionType: 'mirror',
            allowedInterventionTypes: ['mirror', 'reflect', 'validate'],
            forbiddenInterventionTypes: ['open_deepen'],
          }),
        }),
      },
      {
        label: 'safety',
        input: createDecisionInput({
          safety: createPreemptiveSafetyOutput(),
          priority: createBaselinePriorityOutput({
            conversationMode: 'SAFETY',
            recommendedInterventionType: 'safety_response',
            allowedInterventionTypes: ['safety_response', 'pause_session'],
            forbiddenInterventionTypes: ['celebrate_breakthrough'],
            preemptsGoalTransition: true,
          }),
        }),
      },
      {
        label: 'empty_allowed',
        input: createDecisionInput({
          priority: createBaselinePriorityOutput({
            allowedInterventionTypes: [],
            forbiddenInterventionTypes: ['mirror'],
            recommendedInterventionType: 'mirror',
          }),
        }),
      },
    ];

    for (const { label, input } of scenarios) {
      const result = makeDecision(input);
      const forbidden = input.priority?.forbiddenInterventionTypes ?? [];
      assert.ok(
        !isForbiddenIntervention(result.selectedInterventionType, forbidden),
        `${label}: selected ${result.selectedInterventionType} is forbidden`
      );
    }
  });

  it('selects pause_session safety intent as invite_pause_and_breathe', () => {
    const result = makeDecision(
      createDecisionInput({
        safety: createPreemptiveSafetyOutput({
          recommendedInterventionType: 'pause_session',
        }),
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'pause_session',
          allowedInterventionTypes: ['pause_session', 'safety_response'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
      })
    );

    assert.equal(result.selectedInterventionType, 'pause_session');
    assert.equal(result.intent, 'invite_pause_and_breathe');
  });

  it('maps regress suggestedGoalTransition to regress output', () => {
    const result = makeDecision(
      createDecisionInput({
        priority: createBaselinePriorityOutput({
          preemptsGoalTransition: false,
          recommendedInterventionType: 'reflect',
          allowedInterventionTypes: ['reflect'],
          forbiddenInterventionTypes: [],
        }),
        strategy: createBaselineStrategyOutput({ suggestedGoalTransition: 'regress' }),
      })
    );

    assert.equal(result.goalTransition, 'regress');
  });

  it('hold_space strategy nie wybiera deescalate gdy escalation sygnal rekomenduje deescalate', () => {
    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'hold_space' }),
        priority: createBaselinePriorityOutput({
          conversationMode: 'DE_ESCALATING',
          recommendedInterventionType: 'deescalate',
          allowedInterventionTypes: ['pause_session', 'validate', 'reflect'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
      })
    );

    assert.equal(result.strategy, 'hold_space');
    assert.notEqual(result.selectedInterventionType, 'deescalate');
    assert.ok(['validate', 'reflect', 'pause_session'].includes(result.selectedInterventionType));
  });
});

describe('makeDecision — safety fallback order', () => {
  it('uses deescalate in safety mode when safety_response is forbidden', () => {
    const result = makeDecision(
      createDecisionInput({
        safety: createPreemptiveSafetyOutput({
          recommendedInterventionType: 'safety_response',
        }),
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'safety_response',
          allowedInterventionTypes: ['reflect', 'validate', 'deescalate'],
          forbiddenInterventionTypes: ['safety_response'],
          preemptsGoalTransition: true,
        }),
      })
    );

    assert.equal(result.selectedInterventionType, 'deescalate');
    assert.notEqual(result.selectedInterventionType, 'reflect');
  });

  it('uses safety fallback order when allowedInterventionTypes is empty in safety mode', () => {
    const result = makeDecision(
      createDecisionInput({
        safety: createPreemptiveSafetyOutput(),
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'safety_response',
          allowedInterventionTypes: [],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
      })
    );

    assert.ok(
      (['safety_response', 'pause_session', 'deescalate'] as InterventionType[]).includes(
        result.selectedInterventionType
      )
    );
  });
});

describe('makeDecision — safety via conversationMode', () => {
  it('treats priority.conversationMode SAFETY like safety preempt', () => {
    const result = makeDecision(
      createDecisionInput({
        safety: null,
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'safety_response',
          allowedInterventionTypes: ['safety_response', 'deescalate'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
      })
    );

    assert.equal(result.selectedInterventionType, 'safety_response');
    assert.equal(result.goalTransition, 'stay');
    assert.equal(result.strategy, 'build_safety');
  });
});

describe('makeDecision — invariant helpers', () => {
  function assertStrategyCompatible(
    selected: InterventionType,
    strategy: TherapeuticStrategy
  ): void {
    const compatible = STRATEGY_INTERVENTION_COMPATIBILITY[strategy] ?? [];
    assert.ok(
      compatible.includes(selected),
      `Expected ${selected} compatible with ${strategy}, allowed: ${compatible.join(', ')}`
    );
  }

  it('selected type is strategy-compatible and not forbidden', () => {
    const allowed: InterventionType[] = ['mirror', 'reframe'];
    const forbidden: InterventionType[] = ['validate'];
    const strategy = 'build_safety';

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: strategy }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: allowed,
          forbiddenInterventionTypes: forbidden,
        }),
      })
    );

    assert.equal(result.strategy, strategy);
    assert.ok(!isForbiddenIntervention(result.selectedInterventionType, forbidden));
    assertStrategyCompatible(result.selectedInterventionType, strategy);
    // mirror/reframe are incompatible with build_safety — safe fallback, not blind allowed pick
    assert.equal(result.selectedInterventionType, 'reflect');
  });

  it('prefers allowed type when it is strategy-compatible', () => {
    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'build_safety' }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: ['validate', 'reflect', 'mirror'],
          forbiddenInterventionTypes: [],
        }),
      })
    );

    assert.equal(result.selectedInterventionType, 'validate');
    assertStrategyCompatible(result.selectedInterventionType, 'build_safety');
  });

  it('when allowed has only strategy-incompatible types, picks compatible safe fallback', () => {
    const allowed: InterventionType[] = ['mirror', 'open_deepen', 'choice_emotion'];
    const strategy = 'build_safety';

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: strategy }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'mirror',
          allowedInterventionTypes: allowed,
          forbiddenInterventionTypes: [],
        }),
      })
    );

    assertStrategyCompatible(result.selectedInterventionType, strategy);
    const expectedFallback = SAFE_FALLBACK_INTERVENTION_ORDER.find((type) =>
      (STRATEGY_INTERVENTION_COMPATIBILITY[strategy] ?? []).includes(type)
    );
    assert.equal(result.selectedInterventionType, expectedFallback);
    assert.ok(!allowed.includes(result.selectedInterventionType));
  });
});

describe('makeDecision — continuity awareness (Phase 3A)', () => {
  function ineffectiveReflectMemory() {
    return createBaselineSessionMemory({
      recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
      ineffectivePatterns: ['reflect'],
      interventionHistory: [
        {
          interventionId: 'int-r1',
          turnNumber: 2,
          type: 'reflect',
          goal: 'SAFE_OPENING',
          intent: 'increase_emotional_safety',
          strategy: 'validate_emotions',
          expectedEffectId: 'effect-r1',
          signature: 'reflect:SAFE_OPENING:both',
          compliance: {
            compliant: true,
            violationCount: 0,
            blockingViolationCount: 0,
            fallbackUsed: false,
            attemptNumber: 1,
          },
          effective: false,
          confidence: 80,
        },
      ],
    });
  }

  it('avoids repeated ineffective reflect when compatible alternative exists', () => {
    const sessionMemory = ineffectiveReflectMemory();
    const continuityContext = buildContinuityContext({
      sessionMemory,
      recommendedInterventionType: 'reflect',
    });

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'validate_emotions' }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'reflect',
          allowedInterventionTypes: ['reflect', 'validate', 'mirror'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: false,
        }),
        sessionMemory,
        continuityContext,
      })
    );

    assert.notEqual(result.selectedInterventionType, 'reflect');
    assert.ok(['validate', 'mirror'].includes(result.selectedInterventionType));
  });

  it('does not avoid safety_response in safety mode', () => {
    const sessionMemory = createBaselineSessionMemory({
      recentInterventionTypes: ['safety_response', 'safety_response', 'safety_response'],
      ineffectivePatterns: ['safety_response'],
    });
    const continuityContext = buildContinuityContext({
      sessionMemory,
      recommendedInterventionType: 'safety_response',
    });

    const result = makeDecision(
      createDecisionInput({
        safety: createPreemptiveSafetyOutput(),
        priority: createBaselinePriorityOutput({
          conversationMode: 'SAFETY',
          recommendedInterventionType: 'safety_response',
          allowedInterventionTypes: ['safety_response', 'deescalate'],
          forbiddenInterventionTypes: [],
          preemptsGoalTransition: true,
        }),
        sessionMemory,
        continuityContext,
      })
    );

    assert.equal(result.selectedInterventionType, 'safety_response');
  });

  it('forbidden still wins over continuity prefer', () => {
    const sessionMemory = createBaselineSessionMemory({
      effectivePatterns: ['validate'],
      recentInterventionTypes: ['validate'],
    });
    const continuityContext = buildContinuityContext({
      sessionMemory,
      recommendedInterventionType: 'validate',
    });

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: 'validate_emotions' }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: ['validate', 'reflect'],
          forbiddenInterventionTypes: ['validate'],
          preemptsGoalTransition: false,
        }),
        sessionMemory,
        continuityContext,
      })
    );

    assert.notEqual(result.selectedInterventionType, 'validate');
    assert.equal(result.selectedInterventionType, 'reflect');
  });

  it('strategy compatibility still maintained with continuity', () => {
    const sessionMemory = ineffectiveReflectMemory();
    const continuityContext = buildContinuityContext({
      sessionMemory,
      recommendedInterventionType: 'reflect',
    });
    const strategy = 'validate_emotions';

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: strategy }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'reflect',
          allowedInterventionTypes: ['reflect', 'validate', 'mirror'],
          forbiddenInterventionTypes: [],
        }),
        sessionMemory,
        continuityContext,
      })
    );

    const compatible = STRATEGY_INTERVENTION_COMPATIBILITY[strategy] ?? [];
    assert.ok(compatible.includes(result.selectedInterventionType));
    assert.notEqual(result.selectedInterventionType, 'reflect');
  });
});

describe('makeDecision — strategy compatibility fallback respects forbidden (Phase 3A-fix)', () => {
  it('does not restore forbidden reflect from strategy-compatible fallback', () => {
    const strategy = 'validate_emotions';
    const forbidden: InterventionType[] = ['reflect'];

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: strategy }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'open_deepen',
          allowedInterventionTypes: ['open_deepen', 'choice_need'],
          forbiddenInterventionTypes: forbidden,
          preemptsGoalTransition: false,
        }),
      })
    );

    assert.notEqual(result.selectedInterventionType, 'reflect');
    assert.ok(!isForbiddenIntervention(result.selectedInterventionType, forbidden));
    assert.ok(
      ['validate', 'mirror', 'choice_emotion'].includes(result.selectedInterventionType),
      `expected compatible non-forbidden fallback, got ${result.selectedInterventionType}`
    );
  });

  it('uses non-forbidden last resort when all strategy-compatible fallbacks are forbidden', () => {
    const strategy = 'validate_emotions';
    const forbidden: InterventionType[] = ['validate', 'reflect', 'mirror', 'choice_emotion'];

    const result = makeDecision(
      createDecisionInput({
        strategy: createBaselineStrategyOutput({ primaryStrategy: strategy }),
        priority: createBaselinePriorityOutput({
          recommendedInterventionType: 'validate',
          allowedInterventionTypes: ['open_deepen', 'choice_need'],
          forbiddenInterventionTypes: forbidden,
          preemptsGoalTransition: false,
        }),
      })
    );

    assert.ok(!isForbiddenIntervention(result.selectedInterventionType, forbidden));
    assert.ok(
      ['open_deepen', 'choice_need'].includes(result.selectedInterventionType),
      `expected allowed non-forbidden last resort, got ${result.selectedInterventionType}`
    );
  });
});
