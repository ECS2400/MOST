import type { DraftReplyValidation, MediatorLang, SafetyLevel } from '@/types/mediator';
import { LLM_LIMITS } from '@/services/mediatorEngine/llm/config/llmLimits';
import {
  countQuestions,
  countSentences,
  findBlockedTerms,
  validateSafetyReply,
} from '@/services/mediatorEngine/llm/validate/validateSafetyReply';

/** Validates a parsed draft reply against L1 constraints. */
export function validateDraftReply(
  text: string,
  language: MediatorLang,
  safetyLevel: SafetyLevel
): DraftReplyValidation {
  const reasons: string[] = [];
  const trimmed = text.trim();
  const questionCount = countQuestions(trimmed);
  const sentenceCount = countSentences(trimmed);
  const lengthChars = trimmed.length;
  const blockedTermsFound = findBlockedTerms(trimmed);

  if (!trimmed) {
    reasons.push('Empty reply text');
  }

  if (lengthChars > LLM_LIMITS.maxReplyChars) {
    reasons.push(`Reply exceeds max length (${LLM_LIMITS.maxReplyChars} chars)`);
  }

  if (questionCount > LLM_LIMITS.maxQuestions) {
    reasons.push(`Too many questions (${questionCount} > ${LLM_LIMITS.maxQuestions})`);
  }

  if (sentenceCount > LLM_LIMITS.maxSentences) {
    reasons.push(`Too many sentences (${sentenceCount} > ${LLM_LIMITS.maxSentences})`);
  }

  if (blockedTermsFound.length > 0) {
    reasons.push(`Forbidden terms found: ${blockedTermsFound.join(', ')}`);
  }

  const safetyResult = validateSafetyReply(trimmed, safetyLevel, language);
  if (!safetyResult.compliant) {
    reasons.push(...safetyResult.reasons);
  }

  return {
    valid: reasons.length === 0,
    reasons,
    blockedTermsFound,
    questionCount,
    sentenceCount,
    lengthChars,
    safetyCompliant: safetyResult.compliant,
  };
}
