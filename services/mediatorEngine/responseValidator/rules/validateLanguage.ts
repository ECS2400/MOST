import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { detectLanguageLite } from '@/services/mediatorEngine/responseValidator/lib/detectLanguageLite';

/** Lightweight language heuristic for all supported mediator languages. */
export function validateLanguage(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const result = detectLanguageLite(ctx.text, ctx.language);

  if (result.matchesExpected) {
    return {
      ruleId: 'language_lite',
      passed: true,
      severity: 'warn',
      reason: result.reason,
    };
  }

  return {
    ruleId: 'language_lite',
    passed: false,
    severity: result.severity === 'block' ? 'block' : 'warn',
    reason: result.reason,
  };
}
