/**
 * Strategy Engine L1 — unit tests (Phase 1H).
 *
 *   npm run test:mediator:strategy
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectStrategy } from '@/services/mediatorEngine/strategy/selectStrategy';
import {
  createStrategyInput,
  PRIVATE_TEXT,
  withBlameLoop,
  withBothReady,
  withBreakthrough,
  withEscalation,
  withExhaustion,
  withGoal,
  withRecovery,
  withReflectionShift,
  withSafety,
} from '@/services/mediatorEngine/__tests__/strategy/fixtures';

const ESCALATION_STRATEGIES = ['reduce_tension', 'stop_escalation'] as const;

describe('selectStrategy — L1 deterministic selection', () => {
  it('Safety wybiera build_safety', () => {
    const result = selectStrategy(createStrategyInput(withSafety()));

    assert.equal(result.primaryStrategy, 'build_safety');
    assert.equal(result.therapeuticIntent, 'increase_emotional_safety');
    assert.equal(result.suggestedGoalTransition, 'stay');
  });

  it('Recovery wybiera recover_misinterpretation', () => {
    const result = selectStrategy(createStrategyInput(withRecovery()));

    assert.equal(result.primaryStrategy, 'recover_misinterpretation');
    assert.equal(result.therapeuticIntent, 'correct_misunderstanding');
    assert.ok(result.recoveryStrategy);
    assert.equal(result.recoveryStrategy?.primaryStrategy, 'recover_misinterpretation');
  });

  it('Escalation wybiera reduce_tension/stop_escalation', () => {
    const result = selectStrategy(createStrategyInput(withEscalation()));

    assert.ok(ESCALATION_STRATEGIES.includes(result.primaryStrategy as typeof ESCALATION_STRATEGIES[number]));
    assert.equal(result.primaryStrategy, 'reduce_tension');
  });

  it('Blame loop wybiera stop_escalation albo reduce_tension', () => {
    const result = selectStrategy(createStrategyInput(withBlameLoop()));

    assert.ok(ESCALATION_STRATEGIES.includes(result.primaryStrategy as typeof ESCALATION_STRATEGIES[number]));
    assert.equal(result.primaryStrategy, 'stop_escalation');
    assert.equal(result.therapeuticIntent, 'reduce_blame_cycle');
  });

  it('Exhaustion wybiera hold_space', () => {
    const result = selectStrategy(createStrategyInput(withExhaustion()));

    assert.equal(result.primaryStrategy, 'hold_space');
    assert.equal(result.therapeuticIntent, 'acknowledge_exhaustion');
  });

  it('Breakthrough wybiera consolidate_progress', () => {
    const result = selectStrategy(createStrategyInput(withBreakthrough()));

    assert.equal(result.primaryStrategy, 'consolidate_progress');
    assert.equal(result.therapeuticIntent, 'consolidate_breakthrough');
  });

  it('Goal EMOTION_NAMING wybiera validate_emotions', () => {
    const result = selectStrategy(createStrategyInput(withGoal('EMOTION_NAMING')));

    assert.equal(result.primaryStrategy, 'validate_emotions');
    assert.equal(result.alignmentWithGoal, 'EMOTION_NAMING');
  });

  it('Goal NEED_NAMING wybiera transition_to_needs', () => {
    const result = selectStrategy(createStrategyInput(withGoal('NEED_NAMING')));

    assert.equal(result.primaryStrategy, 'transition_to_needs');
    assert.equal(result.alignmentWithGoal, 'NEED_NAMING');
  });

  it('Readiness obu stron → suggestedGoalTransition=prepare_advance', () => {
    const result = selectStrategy(createStrategyInput(withBothReady()));

    assert.equal(result.suggestedGoalTransition, 'prepare_advance');
  });

  it('Safety blokuje prepare_advance mimo readiness', () => {
    const result = selectStrategy(
      createStrategyInput({
        ...withBothReady(),
        ...withSafety(),
      })
    );

    assert.equal(result.suggestedGoalTransition, 'stay');
    assert.equal(result.primaryStrategy, 'build_safety');
  });

  it('Reflection shift pause bez safety wybiera hold_space', () => {
    const result = selectStrategy(
      createStrategyInput({
        ...withReflectionShift('pause'),
        safety: null,
      })
    );

    assert.equal(result.primaryStrategy, 'hold_space');
    assert.equal(result.therapeuticIntent, 'acknowledge_exhaustion');
    assert.equal(result.suggestedGoalTransition, 'stay');
  });

  it('Reflection shift pause z safety.preempted wybiera build_safety', () => {
    const result = selectStrategy(
      createStrategyInput({
        ...withReflectionShift('pause'),
        ...withSafety(),
      })
    );

    assert.equal(result.primaryStrategy, 'build_safety');
  });

  it('Reflection shift deescalate ma priorytet nad goal default', () => {
    const result = selectStrategy(
      createStrategyInput({
        ...withGoal('EMOTION_NAMING'),
        ...withReflectionShift('deescalate'),
      })
    );

    assert.notEqual(result.primaryStrategy, 'validate_emotions');
    assert.ok(ESCALATION_STRATEGIES.includes(result.primaryStrategy as typeof ESCALATION_STRATEGIES[number]));
  });

  it('malformed input nie crashuje', () => {
    assert.doesNotThrow(() => selectStrategy(null as unknown as ReturnType<typeof createStrategyInput>));
    assert.doesNotThrow(() => selectStrategy({} as ReturnType<typeof createStrategyInput>));
    assert.doesNotThrow(() =>
      selectStrategy({
        state: undefined,
        reflection: null,
        safety: 'invalid',
        turnNumber: -1,
      } as unknown as ReturnType<typeof createStrategyInput>)
    );
  });

  it('reason nie jest puste', () => {
    const result = selectStrategy(createStrategyInput(withGoal('EMOTION_NAMING')));
    assert.ok(typeof result.rationale === 'string');
    assert.ok(result.rationale.length > 0);
    assert.match(result.rationale, /primary=/);
  });

  it('confidence jest w zakresie 0–100', () => {
    const scenarios = [
      createStrategyInput(withSafety()),
      createStrategyInput(withRecovery()),
      createStrategyInput(withEscalation()),
      createStrategyInput(withGoal('CLOSURE')),
      createStrategyInput({}),
    ];

    for (const input of scenarios) {
      const result = selectStrategy(input);
      assert.ok(result.confidence >= 0 && result.confidence <= 100, `confidence=${result.confidence}`);
    }
  });

  it('Nie ma transcript content leakage', () => {
    const result = selectStrategy(
      createStrategyInput({
        ...withRecovery(),
        ...withSafety(),
      })
    );

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(PRIVATE_TEXT));
    assert.ok(!result.rationale.includes(PRIVATE_TEXT));
  });
});
