import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';
import { computeTextMetrics } from '@/services/mediatorEngine/responseValidator/lib/textMetrics';

/** Ensures reply length is within limits. */
export function validateLength(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const { lengthChars } = computeTextMetrics(ctx.text);
  const passed = lengthChars <= RESPONSE_VALIDATION_LIMITS.maxReplyChars;
  return {
    ruleId: 'max_length',
    passed,
    severity: 'block',
    reason: passed
      ? `Reply length OK (${lengthChars} chars)`
      : `Reply exceeds max length (${lengthChars} > ${RESPONSE_VALIDATION_LIMITS.maxReplyChars})`,
    metadata: { lengthChars },
  };
}
