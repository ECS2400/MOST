/**
 * Memory Continuity Intelligence — unit tests (Phase 3A).
 *
 *   npm run test:mediator:memory
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InterventionType, SessionMemory } from '@/types/mediator';
import {
  buildContinuityContext,
  detectRepeatedMove,
  selectContinuityHint,
} from '@/services/mediatorEngine/memory/continuity';
import { createBaselineSessionMemory } from '@/services/mediatorEngine/__tests__/memory/fixtures';

function memoryWithRecentTypes(types: InterventionType[]): SessionMemory {
  return createBaselineSessionMemory({
    recentInterventionTypes: types,
    askedInterventionSignatures: ['reflect:SAFE_OPENING:both'],
  });
}

function memoryWithIneffectiveReflect(): SessionMemory {
  return createBaselineSessionMemory({
    recentInterventionTypes: ['reflect'],
    ineffectivePatterns: ['reflect'],
    interventionHistory: [
      {
        interventionId: 'int-1',
        turnNumber: 2,
        type: 'reflect',
        goal: 'SAFE_OPENING',
        intent: 'increase_emotional_safety',
        strategy: 'validate_emotions',
        expectedEffectId: 'effect-1',
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

function memoryWithEffectiveValidate(): SessionMemory {
  return createBaselineSessionMemory({
    recentInterventionTypes: ['validate'],
    effectivePatterns: ['validate'],
    interventionHistory: [
      {
        interventionId: 'int-2',
        turnNumber: 3,
        type: 'validate',
        goal: 'SAFE_OPENING',
        intent: 'help_partner_feel_heard',
        strategy: 'validate_emotions',
        expectedEffectId: 'effect-2',
        signature: 'validate:SAFE_OPENING:both',
        compliance: {
          compliant: true,
          violationCount: 0,
          blockingViolationCount: 0,
          fallbackUsed: false,
          attemptNumber: 1,
        },
        effective: true,
        confidence: 85,
      },
    ],
  });
}

describe('buildContinuityContext — Phase 3A', () => {
  it('no throw on empty memory', () => {
    assert.doesNotThrow(() => {
      const result = buildContinuityContext(null);
      assert.equal(result.repeatedMoveDetected, false);
      assert.equal(result.continuityHint, null);
      assert.equal(result.confidence, 0);
    });
  });

  it('repeated reflect x3 → repeatedMoveDetected=true', () => {
    const result = buildContinuityContext(memoryWithRecentTypes(['reflect', 'reflect', 'reflect']));
    assert.equal(result.repeatedMoveDetected, true);
    assert.ok(result.repeatedMoveReason?.includes('reflect'));
    assert.ok(result.suggestedAvoidTypes.includes('reflect'));
  });

  it('ineffective reflect → suggestedAvoidTypes contains reflect', () => {
    const result = buildContinuityContext(memoryWithIneffectiveReflect());
    assert.ok(result.suggestedAvoidTypes.includes('reflect'));
    assert.equal(result.lastIneffectiveInterventionType, 'reflect');
  });

  it('effective validate → suggestedPreferTypes contains validate', () => {
    const result = buildContinuityContext(memoryWithEffectiveValidate());
    assert.ok(result.suggestedPreferTypes.includes('validate'));
    assert.equal(result.lastEffectiveInterventionType, 'validate');
  });

  it('continuityHint does not contain transcript or email/phone', () => {
    const memory = createBaselineSessionMemory({
      recentInterventionTypes: ['reflect', 'reflect', 'reflect'],
      openTopics: ['partner@example.com', '555-123-4567'],
      interventionHistory: [
        {
          interventionId: 'int-pii',
          turnNumber: 1,
          type: 'reflect',
          goal: 'SAFE_OPENING',
          intent: 'increase_emotional_safety',
          strategy: 'validate_emotions',
          expectedEffectId: 'effect-pii',
          signature: 'reflect:SAFE_OPENING:both',
          compliance: {
            compliant: true,
            violationCount: 0,
            blockingViolationCount: 0,
            fallbackUsed: false,
            attemptNumber: 1,
          },
          effective: false,
          confidence: 70,
        },
      ],
      ineffectivePatterns: ['reflect'],
    });

    const result = buildContinuityContext(memory);
    const hint = result.continuityHint ?? '';
    assert.ok(hint.length > 0);
    assert.ok(!hint.includes('partner@example.com'));
    assert.ok(!hint.includes('555-123-4567'));
    assert.ok(!hint.includes('transcript'));
    assert.ok(!hint.toLowerCase().includes('dialogue'));
  });

  it('detectRepeatedMove requires three consecutive same types', () => {
    assert.equal(detectRepeatedMove(['reflect', 'reflect']).repeatedMoveDetected, false);
    assert.equal(detectRepeatedMove(['reflect', 'reflect', 'reflect']).repeatedMoveDetected, true);
  });

  it('selectContinuityHint prefers ineffective reflection message', () => {
    const hint = selectContinuityHint({
      repeatedMoveDetected: false,
      staleTopicDetected: false,
      lastIneffectiveInterventionType: 'reflect',
      suggestedAvoidTypes: ['reflect'],
      suggestedPreferTypes: [],
    });
    assert.match(hint ?? '', /reflection appeared ineffective/i);
  });
});

describe('SessionMemory — no transcript content (Phase 3A guard)', () => {
  it('serialized session memory still has no transcript fields', () => {
    const memory = memoryWithRecentTypes(['reflect', 'validate']);
    const serialized = JSON.stringify(memory);
    assert.ok(!serialized.includes('transcriptDelta'));
    assert.ok(!serialized.includes('primaryMessage'));
    assert.ok(!serialized.includes('transcript'));
  });
});
