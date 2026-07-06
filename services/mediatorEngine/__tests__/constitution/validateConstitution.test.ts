/**
 * Constitution Validator L1 — unit tests (Phase 1A).
 *
 *   npm run test:mediator:constitution
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateConstitution } from '@/services/mediatorEngine/constitution/validateConstitution';
import { validateDuplicateIntervention } from '@/services/mediatorEngine/constitution/rules/validateDuplicateIntervention';
import { validateDuplicateText } from '@/services/mediatorEngine/constitution/rules/validateDuplicateText';
import { validateExpectedEffect } from '@/services/mediatorEngine/constitution/rules/validateExpectedEffect';
import { validateGoal } from '@/services/mediatorEngine/constitution/rules/validateGoal';
import { validateIntent } from '@/services/mediatorEngine/constitution/rules/validateIntent';
import { validateMessageLength } from '@/services/mediatorEngine/constitution/rules/validateMessageLength';
import { validateNonEmptyMessage } from '@/services/mediatorEngine/constitution/rules/validateNonEmptyMessage';
import { validateQuestionCount } from '@/services/mediatorEngine/constitution/rules/validateQuestionCount';
import { validateRequiredFields } from '@/services/mediatorEngine/constitution/rules/validateRequiredFields';
import { validateSentenceCount } from '@/services/mediatorEngine/constitution/rules/validateSentenceCount';
import { validateSessionPersonality } from '@/services/mediatorEngine/constitution/rules/validateSessionPersonality';
import { validateStrategyInterventionType } from '@/services/mediatorEngine/constitution/rules/validateStrategyInterventionType';
import {
  createL1Context,
  createOverlongMessage,
  createSessionPersonality,
  createValidIntervention,
} from '@/services/mediatorEngine/__tests__/constitution/fixtures';

describe('validateConstitution — end-to-end', () => {
  it('passes for a fully compliant intervention', () => {
    const result = validateConstitution({
      intervention: createValidIntervention(),
      applicableRules: [],
      turnNumber: 5,
      attemptNumber: 1,
    });
    assert.equal(result.compliant, true);
    assert.equal(result.validatorLayer, 'deterministic');
    assert.equal(result.violations.length, 0);
  });

  it('fails when a blocking violation is detected', () => {
    const result = validateConstitution({
      intervention: createValidIntervention({ content: { primaryMessage: '' } }),
      applicableRules: [],
      turnNumber: 5,
      attemptNumber: 1,
    });
    assert.equal(result.compliant, false);
    assert.ok(result.violations.some((v) => v.ruleId === 'l1.non_empty_message'));
  });

  it('does not throw on malformed intervention and returns blocking violations', () => {
    const malformed = { foo: 'bar' } as unknown as import('@/types/mediator').Intervention;
    let result;
    assert.doesNotThrow(() => {
      result = validateConstitution({
        intervention: malformed,
        applicableRules: [{ ruleId: 'l1.non_empty_message', articleRef: 'Art. 3', description: '', severity: 'block', guardCategories: [], applicableInterventionTypes: [] }],
        turnNumber: 1,
        attemptNumber: 1,
      });
    });
    assert.equal(result!.compliant, false);
    assert.ok(
      result!.violations.some((v) => v.ruleId === 'l1.required_fields' || v.ruleId === 'l1.expected_effect')
    );
  });

  it('runs all L1 rules even when applicableRules lists unrelated rule ids', () => {
    const result = validateConstitution({
      intervention: createValidIntervention({ content: { primaryMessage: 'Wow!' } }),
      applicableRules: [
        {
          ruleId: 'l1.unrelated_future_rule',
          articleRef: 'Art. 99',
          description: 'unused',
          severity: 'block',
          guardCategories: [],
          applicableInterventionTypes: [],
        },
      ],
      turnNumber: 5,
      attemptNumber: 1,
      sessionPersonality: createSessionPersonality('calm_anchor'),
    });
    assert.ok(result.violations.some((v) => v.ruleId === 'l1.session_personality'));
  });

  it('applies severity override from applicableRules without disabling other L1 rules', () => {
    const result = validateConstitution({
      intervention: createValidIntervention({ content: { primaryMessage: '' } }),
      applicableRules: [
        {
          ruleId: 'l1.non_empty_message',
          articleRef: 'Art. 3',
          description: 'override',
          severity: 'warn',
          guardCategories: [],
          applicableInterventionTypes: [],
        },
      ],
      turnNumber: 5,
      attemptNumber: 1,
    });
    const emptyMessageViolation = result.violations.find((v) => v.ruleId === 'l1.non_empty_message');
    assert.ok(emptyMessageViolation);
    assert.equal(emptyMessageViolation?.severity, 'warn');
    assert.equal(result.compliant, true);
  });

  it('uses warn severity from registry for session personality violations', () => {
    const result = validateConstitution({
      intervention: createValidIntervention({ content: { primaryMessage: 'Wow!' } }),
      applicableRules: [],
      turnNumber: 5,
      attemptNumber: 1,
      sessionPersonality: createSessionPersonality('calm_anchor'),
    });
    const personalityViolation = result.violations.find(
      (v) => v.ruleId === 'l1.session_personality'
    );
    assert.ok(personalityViolation);
    assert.equal(personalityViolation?.severity, 'warn');
    assert.equal(result.compliant, true);
  });
});

describe('validateNonEmptyMessage', () => {
  it('passes for non-empty primary message', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateNonEmptyMessage(ctx), null);
  });

  it('fails for empty primary message', () => {
    const ctx = createL1Context(createValidIntervention({ content: { primaryMessage: '   ' } }));
    assert.equal(validateNonEmptyMessage(ctx)?.ruleId, 'l1.non_empty_message');
  });
});

describe('validateMessageLength', () => {
  it('passes within max length', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateMessageLength(ctx), null);
  });

  it('fails when combined message exceeds max length', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: createOverlongMessage() } })
    );
    assert.equal(validateMessageLength(ctx)?.ruleId, 'l1.message_length');
  });
});

describe('validateDuplicateText', () => {
  it('passes for distinct primary and secondary messages', () => {
    const ctx = createL1Context(
      createValidIntervention({
        content: { primaryMessage: 'First part.', secondaryMessage: 'Second part.' },
      })
    );
    assert.equal(validateDuplicateText(ctx), null);
  });

  it('fails when primary equals secondary', () => {
    const ctx = createL1Context(
      createValidIntervention({
        content: { primaryMessage: 'Same text.', secondaryMessage: 'Same text.' },
      })
    );
    assert.equal(validateDuplicateText(ctx)?.ruleId, 'l1.duplicate_text');
  });

  it('fails when a sentence is repeated', () => {
    const repeated = 'This is a repeated sentence fragment.';
    const ctx = createL1Context(
      createValidIntervention({
        content: { primaryMessage: `${repeated} ${repeated}` },
      })
    );
    assert.equal(validateDuplicateText(ctx)?.ruleId, 'l1.duplicate_text');
  });
});

describe('validateDuplicateIntervention', () => {
  it('passes for freshly generated intervention with doNotRepeatBefore ahead of current turn', () => {
    const ctx = createL1Context(
      createValidIntervention({ signature: 'sig-a', doNotRepeatBefore: 5 }),
      { turnNumber: 1, recentInterventionSignatures: [] }
    );
    assert.equal(validateDuplicateIntervention(ctx), null);
  });

  it('passes when repeat window has elapsed and signature not in recent list', () => {
    const ctx = createL1Context(
      createValidIntervention({ signature: 'sig-a', doNotRepeatBefore: 3 }),
      { turnNumber: 5, recentInterventionSignatures: ['sig-b'] }
    );
    assert.equal(validateDuplicateIntervention(ctx), null);
  });

  it('does not block current intervention solely because doNotRepeatBefore > turnNumber', () => {
    const result = validateConstitution({
      intervention: createValidIntervention({ doNotRepeatBefore: 5 }),
      applicableRules: [],
      turnNumber: 1,
      attemptNumber: 1,
      recentInterventionSignatures: [],
    });
    assert.equal(
      result.violations.some((v) => v.ruleId === 'l1.duplicate_intervention'),
      false
    );
  });

  it('fails when signature was recently used', () => {
    const ctx = createL1Context(createValidIntervention({ signature: 'sig-a' }), {
      recentInterventionSignatures: ['sig-a'],
    });
    assert.equal(validateDuplicateIntervention(ctx)?.ruleId, 'l1.duplicate_intervention');
  });
});

describe('validateQuestionCount', () => {
  it('passes within question limit', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: 'Jak się czujesz?' } })
    );
    assert.equal(validateQuestionCount(ctx), null);
  });

  it('fails when question count exceeds limit', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: 'A? B? C?' } })
    );
    assert.equal(validateQuestionCount(ctx)?.ruleId, 'l1.question_count');
  });
});

describe('validateSentenceCount', () => {
  it('passes within sentence limit', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: 'One. Two.' } })
    );
    assert.equal(validateSentenceCount(ctx), null);
  });

  it('fails when sentence count exceeds limit', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: 'One. Two. Three. Four. Five.' } })
    );
    assert.equal(validateSentenceCount(ctx)?.ruleId, 'l1.sentence_count');
  });
});

describe('validateExpectedEffect', () => {
  it('passes for complete expected effect', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateExpectedEffect(ctx), null);
  });

  it('fails when description is missing', () => {
    const intervention = createValidIntervention();
    intervention.expectedEffect = { ...intervention.expectedEffect, description: '  ' };
    const ctx = createL1Context(intervention);
    assert.equal(validateExpectedEffect(ctx)?.ruleId, 'l1.expected_effect');
  });
});

describe('validateIntent', () => {
  it('passes for known intent', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateIntent(ctx), null);
  });

  it('fails for unknown intent value', () => {
    const ctx = createL1Context(
      createValidIntervention({ intent: 'invalid_intent' as never })
    );
    assert.equal(validateIntent(ctx)?.ruleId, 'l1.intent');
  });
});

describe('validateGoal', () => {
  it('passes for known goal', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateGoal(ctx), null);
  });

  it('fails for unknown goal value', () => {
    const ctx = createL1Context(createValidIntervention({ goal: 'INVALID_GOAL' as never }));
    assert.equal(validateGoal(ctx)?.ruleId, 'l1.goal');
  });
});

describe('validateStrategyInterventionType', () => {
  it('passes for compatible strategy and type', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateStrategyInterventionType(ctx), null);
  });

  it('fails for incompatible strategy and type', () => {
    const ctx = createL1Context(
      createValidIntervention({ strategy: 'build_safety', type: 'celebrate_breakthrough' })
    );
    assert.equal(validateStrategyInterventionType(ctx)?.ruleId, 'l1.strategy_intervention_type');
  });
});

describe('validateSessionPersonality', () => {
  it('passes when personality is not provided', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateSessionPersonality(ctx), null);
  });

  it('passes within calm_anchor limits', () => {
    const ctx = createL1Context(createValidIntervention(), {
      sessionPersonality: createSessionPersonality('calm_anchor'),
    });
    assert.equal(validateSessionPersonality(ctx), null);
  });

  it('fails when exclamation marks exceed profile limit', () => {
    const ctx = createL1Context(
      createValidIntervention({ content: { primaryMessage: 'Wow!' } }),
      { sessionPersonality: createSessionPersonality('calm_anchor') }
    );
    const draft = validateSessionPersonality(ctx);
    assert.equal(draft?.ruleId, 'l1.session_personality');
    assert.equal(typeof draft?.matchedText, 'string');
    assert.equal('severity' in (draft ?? {}), false);
  });
});

describe('validateRequiredFields', () => {
  it('passes when all required fields are present', () => {
    const ctx = createL1Context(createValidIntervention());
    assert.equal(validateRequiredFields(ctx), null);
  });

  it('fails when id is missing', () => {
    const ctx = createL1Context(createValidIntervention({ id: '  ' }));
    assert.equal(validateRequiredFields(ctx)?.ruleId, 'l1.required_fields');
  });
});
