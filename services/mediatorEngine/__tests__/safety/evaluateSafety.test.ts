/**
 * Human Safety Layer L1 — unit tests (Phase 1I).
 *
 *   npm run test:mediator:safety
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateSafety } from '@/services/mediatorEngine/safety/evaluateSafety';
import { SAFETY_LEVEL_POLICIES } from '@/services/mediatorEngine/safety/config/safetyLevels';
import {
  assertNoQuoteField,
  createSafetyInput,
  messageWithContent,
  PRIVATE_TEXT,
} from '@/services/mediatorEngine/__tests__/safety/fixtures';

function evaluateWithPhrase(phrase: string) {
  return evaluateSafety(
    createSafetyInput({
      transcriptDelta: messageWithContent(phrase),
    })
  );
}

describe('evaluateSafety — L1 deterministic detection', () => {
  it('Brak sygnałów → level none', () => {
    const result = evaluateSafety(createSafetyInput());

    assert.equal(result.level, 'none');
    assert.equal(result.preempted, false);
    assert.equal(result.signals.length, 0);
    assert.equal(result.blockGoalTransitions, false);
    assert.equal(result.blockStandardInterventions, false);
  });

  it('Suicide phrase → L3_stop', () => {
    const result = evaluateWithPhrase('I want to kill myself tonight');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'suicide');
  });

  it('Immediate danger → L3_stop', () => {
    const result = evaluateWithPhrase('I am in immediate danger right now');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'immediate_danger');
  });

  it('Child safety → L3_stop', () => {
    const result = evaluateWithPhrase('my child is being abused at home');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'child_safety');
  });

  it('Violence threat → L3_stop', () => {
    const result = evaluateWithPhrase('I will kill you if you leave');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'violence_threat');
  });

  it('Self harm → L2_pause', () => {
    const result = evaluateWithPhrase('I want to cut myself again');

    assert.equal(result.level, 'L2_pause');
    assert.equal(result.signals[0]?.category, 'self_harm');
  });

  it('"I want to hurt myself" → category self_harm, level L2_pause', () => {
    const result = evaluateWithPhrase('I want to hurt myself');

    assert.equal(result.level, 'L2_pause');
    assert.equal(result.signals[0]?.category, 'self_harm');
  });

  it('"I want to cut myself" → category self_harm, level L2_pause', () => {
    const result = evaluateWithPhrase('I want to cut myself');

    assert.equal(result.level, 'L2_pause');
    assert.equal(result.signals[0]?.category, 'self_harm');
  });

  it('"I want to kill myself" → category suicide, level L3_stop', () => {
    const result = evaluateWithPhrase('I want to kill myself');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'suicide');
  });

  it('"I want to die" → category suicide, level L3_stop', () => {
    const result = evaluateWithPhrase('I want to die');

    assert.equal(result.level, 'L3_stop');
    assert.equal(result.signals[0]?.category, 'suicide');
  });

  it('"hurt myself" nie tworzy sygnału category suicide', () => {
    const result = evaluateWithPhrase('I want to hurt myself');

    assert.ok(!result.signals.some((s) => s.category === 'suicide'));
    assert.ok(result.signals.some((s) => s.category === 'self_harm'));
  });

  it('Abuse disclosure → L2_pause', () => {
    const result = evaluateWithPhrase('he abuses me every day');

    assert.equal(result.level, 'L2_pause');
    assert.equal(result.signals[0]?.category, 'abuse_disclosure');
  });

  it('Coercion/control → L2_pause', () => {
    const result = evaluateWithPhrase("he controls everything and won't let me leave");

    assert.equal(result.level, 'L2_pause');
    assert.equal(result.signals[0]?.category, 'coercion_control');
  });

  it('Mild distress → L1_gentle', () => {
    const result = evaluateWithPhrase('I feel overwhelmed today');

    assert.equal(result.level, 'L1_gentle');
    assert.equal(result.signals[0]?.category, 'severe_distress');
  });

  it('L3 preemptuje i blokuje standardowe interwencje', () => {
    const result = evaluateWithPhrase('I want to end my life');

    assert.equal(result.preempted, true);
    assert.equal(result.blockGoalTransitions, true);
    assert.equal(result.blockStandardInterventions, true);
    assert.equal(result.recommendedInterventionType, 'safety_response');
  });

  it('L2 preemptuje', () => {
    const result = evaluateWithPhrase('I want to hurt myself');

    assert.equal(result.preempted, true);
    assert.equal(result.blockGoalTransitions, true);
    assert.equal(result.blockStandardInterventions, true);
  });

  it('L1 nie preemptuje, ale blokuje goal transition', () => {
    const result = evaluateWithPhrase('I feel overwhelmed');

    assert.equal(result.preempted, false);
    assert.equal(result.blockGoalTransitions, true);
    assert.equal(result.blockStandardInterventions, false);
  });

  it('allowedInterventionTypes zgodne z level', () => {
    const l3 = evaluateWithPhrase('commit suicide now');
    const l2 = evaluateWithPhrase('cut myself');
    const l1 = evaluateWithPhrase('very upset about this');

    assert.deepEqual(l3.allowedInterventionTypes, SAFETY_LEVEL_POLICIES.L3_stop.allowedInterventionTypes);
    assert.deepEqual(l2.allowedInterventionTypes, SAFETY_LEVEL_POLICIES.L2_pause.allowedInterventionTypes);
    assert.deepEqual(l1.allowedInterventionTypes, SAFETY_LEVEL_POLICIES.L1_gentle.allowedInterventionTypes);
  });

  it('Brak transcript content leakage w SafetyOutput', () => {
    const secret = 'SECRET_SUICIDE_PHRASE_kill_myself_now';
    const result = evaluateSafety(
      createSafetyInput({
        transcriptDelta: messageWithContent(secret),
      })
    );

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(secret));
    for (const signal of result.signals) {
      assert.ok(!JSON.stringify(signal).includes(secret));
    }
  });

  it('malformed transcriptDelta no throw', () => {
    assert.doesNotThrow(() =>
      evaluateSafety(
        createSafetyInput({
          transcriptDelta: null as unknown as ReturnType<typeof messageWithContent>,
        })
      )
    );
    assert.doesNotThrow(() =>
      evaluateSafety(
        createSafetyInput({
          transcriptDelta: [{ id: 1, content: 123 }] as unknown as ReturnType<typeof messageWithContent>,
        })
      )
    );
  });

  it('Jeśli kilka sygnałów — wygrywa najwyższy level', () => {
    const result = evaluateSafety(
      createSafetyInput({
        transcriptDelta: messageWithContent('I feel overwhelmed and I want to kill myself'),
      })
    );

    assert.equal(result.level, 'L3_stop');
    assert.ok(result.signals.some((s) => s.category === 'suicide'));
    assert.ok(result.signals.some((s) => s.category === 'severe_distress'));
  });

  it('Każdy signal ma category/confidence/messageId/matchedPatternId/turnNumber', () => {
    const result = evaluateWithPhrase('he hits me every day');

    assert.ok(result.signals.length > 0);
    for (const signal of result.signals) {
      assert.ok(typeof signal.category === 'string');
      assert.ok(typeof signal.confidence === 'number');
      assert.ok(typeof signal.matchedPatternId === 'string');
      assert.ok(typeof signal.turnNumber === 'number');
      assert.ok('messageId' in signal);
      assert.ok(typeof signal.evidenceRef === 'string');
    }
  });

  it('quote nie istnieje w SafetySignal', () => {
    const result = evaluateWithPhrase(PRIVATE_TEXT + ' kill myself');

    for (const signal of result.signals) {
      assertNoQuoteField(signal as unknown as Record<string, unknown>);
    }
  });
});
