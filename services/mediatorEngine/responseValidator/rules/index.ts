import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { validateDraftValidationFlag } from '@/services/mediatorEngine/responseValidator/rules/validateDraftValidationFlag';
import { validateForbiddenTerms } from '@/services/mediatorEngine/responseValidator/rules/validateForbiddenTerms';
import { validateLanguage } from '@/services/mediatorEngine/responseValidator/rules/validateLanguage';
import { validateLength } from '@/services/mediatorEngine/responseValidator/rules/validateLength';
import { validateNoTechnicalLeakage } from '@/services/mediatorEngine/responseValidator/rules/validateNoTechnicalLeakage';
import { validateNonEmptyReply } from '@/services/mediatorEngine/responseValidator/rules/validateNonEmptyReply';
import { validateQuestions } from '@/services/mediatorEngine/responseValidator/rules/validateQuestions';
import { validateSafetyCompliance } from '@/services/mediatorEngine/responseValidator/rules/validateSafetyCompliance';
import { validateSentences } from '@/services/mediatorEngine/responseValidator/rules/validateSentences';

export type ResponseValidationRule = (
  ctx: ResponseValidationContext
) => ResponseValidationRuleResult;

/** Ordered list of post-LLM validation rules. */
export const RESPONSE_VALIDATION_RULES: ResponseValidationRule[] = [
  validateDraftValidationFlag,
  validateNonEmptyReply,
  validateLength,
  validateQuestions,
  validateSentences,
  validateForbiddenTerms,
  validateNoTechnicalLeakage,
  validateSafetyCompliance,
  validateLanguage,
];

export {
  validateDraftValidationFlag,
  validateNonEmptyReply,
  validateLength,
  validateQuestions,
  validateSentences,
  validateForbiddenTerms,
  validateNoTechnicalLeakage,
  validateSafetyCompliance,
  validateLanguage,
};

/** Runs all validation rules against the context. */
export function runAllValidationRules(ctx: ResponseValidationContext): ResponseValidationRuleResult[] {
  return RESPONSE_VALIDATION_RULES.map((rule) => rule(ctx));
}
