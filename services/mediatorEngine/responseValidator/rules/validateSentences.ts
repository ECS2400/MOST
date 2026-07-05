import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';
import { computeTextMetrics } from '@/services/mediatorEngine/responseValidator/lib/textMetrics';

/** Ensures reply has at most four sentences. */
export function validateSentences(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const { sentenceCount } = computeTextMetrics(ctx.text);
  const passed = sentenceCount <= RESPONSE_VALIDATION_LIMITS.maxSentences;
  return {
    ruleId: 'max_sentences',
    passed,
    severity: 'block',
    reason: passed
      ? `Sentence count OK (${sentenceCount})`
      : `Too many sentences (${sentenceCount} > ${RESPONSE_VALIDATION_LIMITS.maxSentences})`,
    metadata: { sentenceCount },
  };
}
