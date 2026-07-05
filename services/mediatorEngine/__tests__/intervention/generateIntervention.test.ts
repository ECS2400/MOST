/**
 * Intervention Engine L1 — unit tests (Phase 1E).
 *
 *   npm run test:mediator:intervention
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InterventionEngineInput, InterventionType } from '@/types/mediator';
import { ALL_INTERVENTION_TYPES } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import {
  DO_NOT_REPEAT_BEFORE_OFFSET,
  DEFAULT_DO_NOT_REPEAT_OFFSET,
} from '@/services/mediatorEngine/intervention/config/doNotRepeatBefore';
import { LIBRARY_PATTERN_IDS } from '@/services/mediatorEngine/intervention/config/libraryPatternIds';
import { buildExpectedEffect } from '@/services/mediatorEngine/intervention/lib/buildExpectedEffect';
import { buildLibraryPatternId } from '@/services/mediatorEngine/intervention/lib/buildLibraryPatternId';
import { buildSignature } from '@/services/mediatorEngine/intervention/lib/buildSignature';
import {
  INTERVENTION_PLACEHOLDER_MESSAGE,
} from '@/services/mediatorEngine/intervention/factory/createIntervention';
import { generateIntervention } from '@/services/mediatorEngine/intervention/generateIntervention';
import { createInterventionInput } from '@/services/mediatorEngine/__tests__/intervention/fixtures';

const REQUIRED_FIELDS = [
  'id',
  'type',
  'target',
  'visibility',
  'content',
  'goal',
  'intent',
  'strategy',
  'rationale',
  'expectedEffect',
  'libraryPatternId',
  'signature',
  'generatedAt',
  'doNotRepeatBefore',
] as const;

function assertCompleteIntervention(result: ReturnType<typeof generateIntervention>): void {
  for (const field of REQUIRED_FIELDS) {
    assert.ok(field in result, `missing field: ${field}`);
  }
  assert.ok(result.content.primaryMessage.length > 0);
}

describe('generateIntervention — L1 deterministic builder', () => {
  it('produces a complete Intervention object', () => {
    const result = generateIntervention(createInterventionInput());
    assertCompleteIntervention(result);
    assert.equal(result.type, 'validate');
    assert.equal(result.goal, 'EMOTION_NAMING');
    assert.equal(result.intent, 'help_partner_feel_heard');
    assert.equal(result.strategy, 'validate_emotions');
    assert.equal(result.target, 'both');
    assert.equal(result.visibility, 'public');
  });

  it('builds a deterministic signature as type|goal|target|strategy', () => {
    const result = generateIntervention(createInterventionInput());
    assert.equal(
      result.signature,
      buildSignature({
        type: 'validate',
        goal: 'EMOTION_NAMING',
        target: 'both',
        strategy: 'validate_emotions',
      })
    );
    assert.equal(result.signature, 'validate|EMOTION_NAMING|both|validate_emotions');
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(result.signature));
  });

  it('includes an expectedEffect with id and description', () => {
    const result = generateIntervention(createInterventionInput());
    assert.ok(result.expectedEffect);
    assert.equal(result.expectedEffect.id, 'effect-validate-v1');
    assert.ok(result.expectedEffect.description.length > 0);
    assert.ok(Array.isArray(result.expectedEffect.observableSignals));
  });

  it('includes a libraryPatternId', () => {
    const result = generateIntervention(createInterventionInput());
    assert.equal(result.libraryPatternId, 'validate_v1');
  });

  it('sets generatedAt as an ISO timestamp', () => {
    const result = generateIntervention(createInterventionInput());
    assert.ok(!Number.isNaN(Date.parse(result.generatedAt)));
    assert.ok(result.generatedAt.includes('T'));
  });

  it('sets doNotRepeatBefore according to config offsets', () => {
    const turnNumber = 10;
    const cases: Array<{ type: InterventionType; expected: number }> = [
      { type: 'celebrate_breakthrough', expected: turnNumber + 8 },
      { type: 'pause_session', expected: turnNumber + 6 },
      { type: 'deescalate', expected: turnNumber + 4 },
      { type: 'validate', expected: turnNumber + 2 },
      { type: 'reflect', expected: turnNumber + 2 },
      { type: 'mirror', expected: turnNumber + DEFAULT_DO_NOT_REPEAT_OFFSET },
    ];

    for (const { type, expected } of cases) {
      const result = generateIntervention(
        createInterventionInput({
          turnNumber,
          decision: {
            selectedInterventionType: type,
            intent: 'increase_emotional_safety',
            strategy: 'build_safety',
            goalTransition: 'stay',
            rationale: 'test',
          },
        })
      );
      assert.equal(result.doNotRepeatBefore, expected, `doNotRepeatBefore for ${type}`);
    }
  });

  it('uses placeholder primaryMessage without secondaryMessage', () => {
    const result = generateIntervention(createInterventionInput());
    assert.equal(result.content.primaryMessage, INTERVENTION_PLACEHOLDER_MESSAGE);
    assert.equal(result.content.secondaryMessage, undefined);
  });

  it('does not throw on partial or malformed input', () => {
    assert.doesNotThrow(() => {
      const result = generateIntervention({
        state: {} as InterventionEngineInput['state'],
        intent: {} as InterventionEngineInput['intent'],
        decision: {} as InterventionEngineInput['decision'],
        turnNumber: 2,
      });
      assertCompleteIntervention(result);
    });
  });

  it('defines expectedEffect for every InterventionType', () => {
    for (const type of ALL_INTERVENTION_TYPES) {
      const effect = buildExpectedEffect(type);
      assert.equal(effect.id, `effect-${type}-v1`);
      assert.ok(effect.description.length > 0);
      assert.ok(effect.successCriteria);
    }
  });

  it('defines libraryPatternId for every InterventionType', () => {
    for (const type of ALL_INTERVENTION_TYPES) {
      const patternId = buildLibraryPatternId(type);
      assert.equal(patternId, LIBRARY_PATTERN_IDS[type]);
      assert.ok(patternId.endsWith('_v1'));
    }
  });

  it('produces identical signatures for identical inputs', () => {
    const input = createInterventionInput({ turnNumber: 7 });
    const first = generateIntervention(input);
    const second = generateIntervention(input);
    assert.equal(first.signature, second.signature);
  });

  it('produces different signatures for different intervention types', () => {
    const base = createInterventionInput({ turnNumber: 7 });
    const validate = generateIntervention({
      ...base,
      decision: { ...base.decision, selectedInterventionType: 'validate' },
    });
    const reflect = generateIntervention({
      ...base,
      decision: { ...base.decision, selectedInterventionType: 'reflect' },
    });
    assert.notEqual(validate.signature, reflect.signature);
  });

  it('uses safety override rationale for safety_response with build_safety strategy', () => {
    const result = generateIntervention(
      createInterventionInput({
        decision: {
          selectedInterventionType: 'safety_response',
          intent: 'increase_emotional_safety',
          strategy: 'build_safety',
          goalTransition: 'stay',
          rationale: 'mode=safety',
        },
      })
    );
    assert.equal(result.rationale, 'generated from safety override');
  });

  it('documents repeat offsets in config for key intervention types', () => {
    assert.equal(DO_NOT_REPEAT_BEFORE_OFFSET.celebrate_breakthrough, 8);
    assert.equal(DO_NOT_REPEAT_BEFORE_OFFSET.pause_session, 6);
    assert.equal(DO_NOT_REPEAT_BEFORE_OFFSET.deescalate, 4);
    assert.equal(DO_NOT_REPEAT_BEFORE_OFFSET.validate, 2);
    assert.equal(DO_NOT_REPEAT_BEFORE_OFFSET.reflect, 2);
  });
});
