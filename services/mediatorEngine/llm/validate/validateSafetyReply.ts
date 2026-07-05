import type { MediatorLang, SafetyLevel } from '@/types/mediator';
import {
  CONFLICT_ESCALATION_PHRASES,
  FORBIDDEN_LLM_TERMS,
  SAFETY_REQUIRED_PATTERNS_EN,
  SAFETY_REQUIRED_PATTERNS_PL,
} from '@/services/mediatorEngine/llm/config/forbiddenLlmOutput';

function isSafetyLevelActive(level: SafetyLevel): boolean {
  return level === 'L2_pause' || level === 'L3_stop';
}

function hasSafetyWording(text: string, language: MediatorLang): boolean {
  const patterns = language === 'pl' ? SAFETY_REQUIRED_PATTERNS_PL : SAFETY_REQUIRED_PATTERNS_EN;
  return patterns.some((pattern) => pattern.test(text));
}

function hasConflictEscalation(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFLICT_ESCALATION_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

/** Validates safety-specific constraints for L2/L3 replies. */
export function validateSafetyReply(
  text: string,
  safetyLevel: SafetyLevel,
  language: MediatorLang
): { compliant: boolean; reasons: string[] } {
  if (!isSafetyLevelActive(safetyLevel)) {
    return { compliant: true, reasons: [] };
  }

  const reasons: string[] = [];

  if (!hasSafetyWording(text, language)) {
    reasons.push('Missing required safety/pause wording for L2/L3');
  }

  if (hasConflictEscalation(text)) {
    reasons.push('Encourages conflict escalation or blame');
  }

  const lower = text.toLowerCase();
  const normalMediationPhrases = [
    'let us explore',
    'let\'s explore',
    'what happened between',
    'move forward with the mediation',
    'kontynuujmy mediacj',
    'przeanalizujmy konflikt',
  ];
  if (normalMediationPhrases.some((phrase) => lower.includes(phrase))) {
    reasons.push('Continues normal mediation under safety level');
  }

  return { compliant: reasons.length === 0, reasons };
}

/** Finds forbidden terms present in text. */
export function findBlockedTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_LLM_TERMS.filter((term) => lower.includes(term));
}

/** Counts question marks in text. */
export function countQuestions(text: string): number {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

/** Counts sentences using simple punctuation heuristics. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const parts = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return Math.max(parts.length, 1);
}

export { isSafetyLevelActive, hasSafetyWording, hasConflictEscalation };
