/**
 * Constitution Compliance Validator — Mediator AI Engine v2.3 pipeline step 8.
 *
 * Role: enforces Konstytucja Mediatora rules on generated intervention content.
 * Phase 1A: deterministic L1 rules only — no LLM.
 */

import type {
  ComplianceResult,
  ConstitutionValidatorInput,
} from '@/types/mediator';
import { L1_LIMITS } from '@/services/mediatorEngine/constitution/config/l1Limits';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import { CONSTITUTION_L1_RULES } from '@/services/mediatorEngine/constitution/rules/index';
import {
  applyRuleSeverity,
  finalizeViolationFromRegistry,
  type ConstitutionL1Context,
} from '@/services/mediatorEngine/constitution/rules/types';

/** Builds the shared L1 validation context from validator input. */
function buildL1Context(input: ConstitutionValidatorInput): ConstitutionL1Context {
  return {
    intervention: input.intervention,
    turnNumber: input.turnNumber,
    attemptNumber: input.attemptNumber,
    sessionPersonality: input.sessionPersonality ?? null,
    recentInterventionSignatures: input.recentInterventionSignatures ?? [],
    limits: L1_LIMITS,
  };
}

/**
 * Validates an intervention against applicable constitution rules.
 *
 * @param input - Generated intervention, rules, turn index, and attempt number.
 * @returns Compliance result with violations and fallback metadata.
 */
export function validateConstitution(
  input: ConstitutionValidatorInput
): ComplianceResult {
  const ctx = buildL1Context(input);
  const requiredFieldsRule = CONSTITUTION_L1_RULES.find(
    (rule) => rule.ruleId === 'l1.required_fields'
  );

  const violations = CONSTITUTION_L1_RULES.flatMap((rule) => {
    try {
      const draft = rule.validate(ctx);
      if (!draft) return [];
      const finalized = finalizeViolationFromRegistry(draft, rule);
      return [applyRuleSeverity(finalized, input.applicableRules)];
    } catch (error) {
      const fallbackRule = requiredFieldsRule ?? rule;
      const draft = createViolation(
        'l1.required_fields',
        `rule ${rule.ruleId} threw: ${String(error)}`
      );
      const finalized = finalizeViolationFromRegistry(draft, fallbackRule);
      return [applyRuleSeverity(finalized, input.applicableRules)];
    }
  });

  const hasBlockingViolation = violations.some((violation) => violation.severity === 'block');

  return {
    compliant: !hasBlockingViolation,
    violations,
    attemptNumber: input.attemptNumber,
    fallbackUsed: false,
    validatedAt: new Date().toISOString(),
    validatorLayer: 'deterministic',
  };
}

/** @internal Exported for architecture tests — total registered L1 rules. */
export { CONSTITUTION_L1_RULES };
