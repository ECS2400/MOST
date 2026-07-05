import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';

/** Ensures reply text is non-empty. */
export function validateNonEmptyReply(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const passed = ctx.text.trim().length > 0;
  return {
    ruleId: 'non_empty',
    passed,
    severity: 'block',
    reason: passed ? 'Reply text is present' : 'Reply text is empty',
  };
}
