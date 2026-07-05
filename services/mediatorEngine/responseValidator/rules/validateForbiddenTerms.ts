import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { FORBIDDEN_RESPONSE_TERMS } from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';
import { findForbiddenTerms } from '@/services/mediatorEngine/responseValidator/lib/termMatching';

/** Ensures reply does not contain forbidden technical terms. */
export function validateForbiddenTerms(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const found = findForbiddenTerms(ctx.text, FORBIDDEN_RESPONSE_TERMS);
  const passed = found.length === 0;
  return {
    ruleId: 'forbidden_terms',
    passed,
    severity: 'block',
    reason: passed ? 'No forbidden terms found' : `Forbidden terms found: ${found.join(', ')}`,
    metadata: { count: found.length },
  };
}

export { findForbiddenTerms };
