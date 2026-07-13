import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { isEarlyExplorationGoal } from '@/services/mediatorEngine/goalContinuity/therapeuticExplorationReadiness';
import {
  genericMediatorForbiddenPhrases,
  solutionSeekingForbiddenPhrases,
} from '@/services/mediatorEngine/promptComposer/config/therapeuticStageConstraints';
import { LOCALIZED_NORMAL_TEXT } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findForbiddenPhrase(text: string, phrases: readonly string[]): string | null {
  const normalized = normalizeForMatch(text);
  for (const phrase of phrases) {
    if (normalized.includes(normalizeForMatch(phrase))) {
      return phrase;
    }
  }
  return null;
}

/** Blocks solution-seeking and generic fallback language during early exploration goals. */
export function validateTherapeuticFlow(ctx: ResponseValidationContext): ResponseValidationRuleResult {
  const currentGoal = ctx.currentGoal;

  if (!isEarlyExplorationGoal(currentGoal)) {
    return {
      ruleId: 'therapeutic_flow',
      passed: true,
      severity: 'warn',
      reason: 'Not an early exploration goal',
    };
  }

  const text = ctx.text.trim();
  if (!text) {
    return {
      ruleId: 'therapeutic_flow',
      passed: true,
      severity: 'warn',
      reason: 'Empty text handled elsewhere',
    };
  }

  const localizedFallback = LOCALIZED_NORMAL_TEXT[ctx.language];
  if (localizedFallback && normalizeForMatch(text).includes(normalizeForMatch(localizedFallback))) {
    return {
      ruleId: 'therapeutic_flow',
      passed: false,
      severity: 'block',
      reason: 'Generic deterministic fallback text is not allowed during exploration',
    };
  }

  const solutionPhrase = findForbiddenPhrase(text, solutionSeekingForbiddenPhrases(ctx.language));
  if (solutionPhrase) {
    return {
      ruleId: 'therapeutic_flow',
      passed: false,
      severity: 'block',
      reason: `Solution-seeking language is too early for goal ${currentGoal}: "${solutionPhrase}"`,
    };
  }

  const genericPhrase = findForbiddenPhrase(text, genericMediatorForbiddenPhrases(ctx.language));
  if (genericPhrase) {
    return {
      ruleId: 'therapeutic_flow',
      passed: false,
      severity: 'block',
      reason: `Generic mediator filler is not allowed during exploration: "${genericPhrase}"`,
    };
  }

  return {
    ruleId: 'therapeutic_flow',
    passed: true,
    severity: 'warn',
    reason: 'Therapeutic flow constraints satisfied',
  };
}
