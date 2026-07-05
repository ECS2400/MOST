import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';

/** Ensures draft reply was not pre-flagged invalid by the LLM bridge. */
export function validateDraftValidationFlag(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const passed = ctx.draftReply.validation?.valid !== false;
  return {
    ruleId: 'draft_validation_flag',
    passed,
    severity: 'block',
    reason: passed
      ? 'Draft validation flag OK'
      : 'Draft reply marked invalid by LLM bridge',
  };
}
