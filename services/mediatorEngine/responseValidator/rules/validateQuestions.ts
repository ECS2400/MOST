import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';
import { computeTextMetrics } from '@/services/mediatorEngine/responseValidator/lib/textMetrics';

/** Ensures reply has at most one question. */
export function validateQuestions(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const { questionCount } = computeTextMetrics(ctx.text);
  const passed = questionCount <= RESPONSE_VALIDATION_LIMITS.maxQuestions;
  return {
    ruleId: 'max_questions',
    passed,
    severity: 'block',
    reason: passed
      ? `Question count OK (${questionCount})`
      : `Too many questions (${questionCount} > ${RESPONSE_VALIDATION_LIMITS.maxQuestions})`,
    metadata: { questionCount },
  };
}
