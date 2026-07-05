import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { NORMAL_MEDIATION_PHRASES } from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';
import { hasSafetyWordingForLanguage } from '@/services/mediatorEngine/llm/config/safetyLanguagePatterns';

function isSafetyActive(level: ResponseValidationContext['safetyLevel']): boolean {
  return level === 'L2_pause' || level === 'L3_stop';
}

function hasSafetyWording(text: string, language: ResponseValidationContext['language']): boolean {
  return hasSafetyWordingForLanguage(text, language);
}

/** Ensures L2/L3 replies include safety/pause wording and avoid normal mediation. */
export function validateSafetyCompliance(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  if (!isSafetyActive(ctx.safetyLevel)) {
    return {
      ruleId: 'safety_compliance',
      passed: true,
      severity: 'block',
      reason: 'Safety level does not require safety wording',
    };
  }

  const lower = ctx.text.toLowerCase();
  const reasons: string[] = [];

  if (!hasSafetyWording(ctx.text, ctx.language)) {
    reasons.push('Missing required safety/pause wording for L2/L3');
  }

  if (NORMAL_MEDIATION_PHRASES.some((phrase) => lower.includes(phrase))) {
    reasons.push('Continues normal mediation under safety level');
  }

  const passed = reasons.length === 0;
  return {
    ruleId: 'safety_compliance',
    passed,
    severity: 'block',
    reason: passed ? 'Safety compliance OK' : reasons.join('; '),
  };
}
