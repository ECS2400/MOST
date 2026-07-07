/**
 * Adaptive Intervention Selection — unit tests (Phase 3F core).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/decision/adaptiveInterventionSelection.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContinuityContext, InterventionType } from '@/types/mediator';
import {
  chooseAdaptiveInterventionType,
  scoreInterventionCandidate,
} from '@/services/mediatorEngine/decision/adaptiveInterventionSelection';
import type { AdaptiveInterventionSelectionInput } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/types';

function baseInput(
  overrides: Partial<AdaptiveInterventionSelectionInput> = {}
): AdaptiveInterventionSelectionInput {
  return {
    baselineType: 'reflect',
    permitted: ['reflect', 'validate', 'mirror'],
    safetyActive: false,
    ...overrides,
  };
}

function continuity(overrides: Partial<ContinuityContext> = {}): ContinuityContext {
  return {
    recentInterventionTypes: [],
    recentSignatures: [],
    effectivePatterns: [],
    ineffectivePatterns: [],
    repeatedMoveDetected: false,
    repeatedMoveReason: null,
    staleTopicDetected: false,
    staleTopicReason: null,
    lastEffectiveInterventionType: null,
    lastIneffectiveInterventionType: null,
    suggestedAvoidTypes: [],
    suggestedPreferTypes: [],
    continuityHint: null,
    confidence: 0,
    ...overrides,
  };
}

describe('Phase 3F core — adaptive intervention selection', () => {
  it('1. baseline stays when signals are weak', () => {
    const input = baseInput({
      baselineType: 'reflect',
      permitted: ['reflect', 'validate'],
    });

    assert.equal(chooseAdaptiveInterventionType(input), 'reflect');
  });

  it('2. prefer type wins when score and delta are met', () => {
    const input = baseInput({
      baselineType: 'reflect',
      permitted: ['reflect', 'validate', 'mirror'],
      recommendedInterventionType: 'validate',
      continuityContext: continuity({
        suggestedPreferTypes: ['validate'],
        lastEffectiveInterventionType: 'validate',
      }),
    });

    assert.equal(chooseAdaptiveInterventionType(input), 'validate');
  });

  it('3. avoid type does not win', () => {
    const input = baseInput({
      baselineType: 'reflect',
      permitted: ['reflect', 'validate'],
      recommendedInterventionType: 'validate',
      continuityContext: continuity({
        suggestedPreferTypes: ['validate'],
        lastEffectiveInterventionType: 'validate',
        suggestedAvoidTypes: ['validate'],
      }),
    });

    assert.equal(chooseAdaptiveInterventionType(input), 'reflect');
  });

  it('4. lastEffectiveInterventionType receives bonus', () => {
    const input = baseInput({ baselineType: 'mirror' });
    const validateBase = scoreInterventionCandidate(input, {
      type: 'validate',
      kind: 'alternative',
    });

    const withEffective = baseInput({
      baselineType: 'mirror',
      recommendedInterventionType: 'validate',
      continuityContext: continuity({
        suggestedPreferTypes: ['validate'],
        lastEffectiveInterventionType: 'validate',
      }),
    });
    const validateEffective = scoreInterventionCandidate(withEffective, {
      type: 'validate',
      kind: 'alternative',
    });

    assert.ok(validateEffective.score > validateBase.score);
    assert.equal(chooseAdaptiveInterventionType(withEffective), 'validate');
  });

  it('5. lastIneffectiveInterventionType receives penalty', () => {
    const withoutPenalty = baseInput({
      baselineType: 'validate',
      recommendedInterventionType: 'reflect',
      continuityContext: continuity({ suggestedPreferTypes: ['reflect'] }),
    });
    const withPenalty = baseInput({
      baselineType: 'validate',
      recommendedInterventionType: 'reflect',
      continuityContext: continuity({
        suggestedPreferTypes: ['reflect'],
        lastIneffectiveInterventionType: 'reflect',
      }),
    });

    const reflectNoPenalty = scoreInterventionCandidate(withoutPenalty, {
      type: 'reflect',
      kind: 'alternative',
    });
    const reflectPenalty = scoreInterventionCandidate(withPenalty, {
      type: 'reflect',
      kind: 'alternative',
    });

    assert.ok(reflectPenalty.score < reflectNoPenalty.score);
    assert.equal(chooseAdaptiveInterventionType(withPenalty), 'validate');
  });

  it('6. recent repeat penalty blocks repeating type', () => {
    const input = baseInput({
      baselineType: 'validate',
      permitted: ['reflect', 'validate'],
      recommendedInterventionType: 'reflect',
      continuityContext: continuity({
        recentInterventionTypes: ['reflect', 'reflect'],
        suggestedPreferTypes: ['reflect'],
      }),
    });

    const reflectScore = scoreInterventionCandidate(input, { type: 'reflect', kind: 'alternative' });
    assert.ok(reflectScore.score < 40);

    assert.equal(chooseAdaptiveInterventionType(input), 'validate');
  });

  it('7. safetyActive returns baseline', () => {
    const input = baseInput({
      baselineType: 'reflect',
      safetyActive: true,
      recommendedInterventionType: 'validate',
      continuityContext: continuity({
        suggestedPreferTypes: ['validate'],
        lastEffectiveInterventionType: 'validate',
      }),
    });

    assert.equal(chooseAdaptiveInterventionType(input), 'reflect');
  });

  it('8. adaptive never selects outside permitted', () => {
    const permitted: InterventionType[] = ['reflect', 'validate'];
    const input = baseInput({
      baselineType: 'reflect',
      permitted,
      recommendedInterventionType: 'mirror',
      continuityContext: continuity({
        suggestedPreferTypes: ['mirror'],
        lastEffectiveInterventionType: 'mirror',
      }),
    });

    const selected = chooseAdaptiveInterventionType(input);
    assert.ok(permitted.includes(selected));
  });

  it('9. malformed or empty candidate set falls back to baseline', () => {
    assert.equal(chooseAdaptiveInterventionType(null), 'deescalate');
    assert.equal(chooseAdaptiveInterventionType(undefined), 'deescalate');
    assert.equal(
      chooseAdaptiveInterventionType(
        baseInput({ baselineType: 'reflect', permitted: [] })
      ),
      'reflect'
    );
  });

  it('10. repeatedMoveDetected penalizes the most recent repeated type', () => {
    const input = baseInput({
      baselineType: 'validate',
      permitted: ['reflect', 'validate', 'mirror'],
      continuityContext: continuity({
        recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
        repeatedMoveDetected: true,
        suggestedPreferTypes: ['reflect'],
      }),
    });

    const reflectScore = scoreInterventionCandidate(input, { type: 'reflect', kind: 'alternative' });
    assert.ok(reflectScore.score <= 15);

    assert.equal(chooseAdaptiveInterventionType(input), 'validate');
  });
});
