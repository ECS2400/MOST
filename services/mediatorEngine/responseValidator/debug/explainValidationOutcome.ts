/**
 * Debug-only validation trace — no prompts, no transcripts.
 * Enable in tests via MEDIATOR_VALIDATION_DEBUG=1.
 */

import type { MediatorLang, ResponseValidationInput, SafetyLevel } from '@/types/mediator';
import { validateDraftReply } from '@/services/mediatorEngine/llm/validate/validateDraftReply';
import { detectLanguageLite } from '@/services/mediatorEngine/responseValidator/lib/detectLanguageLite';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';
import { safeResponseValidationInput } from '@/services/mediatorEngine/responseValidator/lib/safeResponseValidationInput';

export interface ValidationRuleTrace {
  ruleId: string;
  passed: boolean;
  severity: 'block' | 'warn';
  reason: string;
}

export interface ValidationOutcomeExplanation {
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  draftBridge: {
    valid: boolean;
    reasons: string[];
    stage: 'validateDraftReply';
  };
  languageHeuristic: ReturnType<typeof detectLanguageLite>;
  responseValidator: {
    action: string;
    valid: boolean;
    blockingReasons: string[];
    warningReasons: string[];
    rules: ValidationRuleTrace[];
    stage: 'validateMediatorReply';
  };
  likelyStage:
    | 'validateDraftReply'
    | 'validateLanguage'
    | 'validateSafetyCompliance'
    | 'validateDraftValidationFlag'
    | 'forbidden_terms'
    | 'validateMediatorReply'
    | 'provider_error'
    | 'unknown';
}

function inferLikelyStage(explanation: ValidationOutcomeExplanation): ValidationOutcomeExplanation['likelyStage'] {
  if (!explanation.draftBridge.valid) return 'validateDraftReply';

  const failed = explanation.responseValidator.rules.filter((r) => !r.passed);
  if (failed.length === 0) return 'validateMediatorReply';

  const firstBlock = failed.find((r) => r.severity === 'block');
  if (!firstBlock) return 'validateMediatorReply';

  switch (firstBlock.ruleId) {
    case 'language_lite':
      return 'validateLanguage';
    case 'safety_compliance':
      return 'validateSafetyCompliance';
    case 'draft_validation_flag':
      return 'validateDraftValidationFlag';
    case 'forbidden_terms':
      return 'forbidden_terms';
    default:
      return 'validateMediatorReply';
  }
}

/** Explains why a reply passed or failed validation — debug/test only. */
export function explainValidationOutcome(
  input: ResponseValidationInput | unknown
): ValidationOutcomeExplanation {
  const ctx = safeResponseValidationInput(input);
  const draftBridge = validateDraftReply(ctx.text, ctx.language, ctx.safetyLevel);
  const languageHeuristic = detectLanguageLite(ctx.text, ctx.language);
  const response = validateMediatorReply(input);

  const explanation: ValidationOutcomeExplanation = {
    language: ctx.language,
    safetyLevel: ctx.safetyLevel,
    draftBridge: {
      valid: draftBridge.valid,
      reasons: draftBridge.reasons,
      stage: 'validateDraftReply',
    },
    languageHeuristic,
    responseValidator: {
      action: response.action,
      valid: response.valid,
      blockingReasons: response.blockingReasons,
      warningReasons: response.warningReasons,
      rules: response.ruleResults.map((rule) => ({
        ruleId: rule.ruleId,
        passed: rule.passed,
        severity: rule.severity,
        reason: rule.reason,
      })),
      stage: 'validateMediatorReply',
    },
    likelyStage: 'unknown',
  };

  explanation.likelyStage = inferLikelyStage(explanation);
  return explanation;
}

/** Prints a compact validation trace when MEDIATOR_VALIDATION_DEBUG=1. */
export function logValidationOutcomeIfDebug(
  label: string,
  input: ResponseValidationInput | unknown
): ValidationOutcomeExplanation {
  const explanation = explainValidationOutcome(input);
  if (process.env.MEDIATOR_VALIDATION_DEBUG === '1') {
    console.log(
      JSON.stringify({
        label,
        language: explanation.language,
        likelyStage: explanation.likelyStage,
        draftBridge: explanation.draftBridge,
        languageHeuristic: explanation.languageHeuristic,
        action: explanation.responseValidator.action,
        blockingReasons: explanation.responseValidator.blockingReasons,
        warningReasons: explanation.responseValidator.warningReasons,
        failedRules: explanation.responseValidator.rules.filter((r) => !r.passed),
      })
    );
  }
  return explanation;
}
