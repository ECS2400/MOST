import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { TECHNICAL_LEAKAGE_TERMS } from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';
import { findTechnicalLeakageTerms } from '@/services/mediatorEngine/responseValidator/lib/termMatching';

/** Ensures reply does not leak internal technical identifiers. */
export function validateNoTechnicalLeakage(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const found = findTechnicalLeakageTerms(ctx.text, TECHNICAL_LEAKAGE_TERMS);
  const passed = found.length === 0;
  return {
    ruleId: 'no_technical_leakage',
    passed,
    severity: 'block',
    reason: passed ? 'No technical leakage detected' : `Technical leakage detected: ${found.join(', ')}`,
    metadata: { count: found.length },
  };
}

export { findTechnicalLeakageTerms };
