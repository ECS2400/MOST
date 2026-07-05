import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { detectLanguageLite } from '@/services/mediatorEngine/responseValidator/lib/detectLanguageLite';

/** Lightweight language heuristic for PL/EN replies. */
export function validateLanguage(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  if (ctx.language !== 'pl' && ctx.language !== 'en') {
    return {
      ruleId: 'language_lite',
      passed: true,
      severity: 'warn',
      reason: 'Language heuristic skipped for non PL/EN locale',
    };
  }

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
