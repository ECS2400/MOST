import type { DraftMediatorReply, MediatorLang, SafetyLevel, TurnNumber } from '@/types/mediator';
import { LLM_LIMITS } from '@/services/mediatorEngine/llm/config/llmLimits';
import {
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
  localizedMediatorText,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import { countQuestions, countSentences } from '@/services/mediatorEngine/llm/validate/validateSafetyReply';

function fallbackText(language: MediatorLang, safetyLevel: SafetyLevel): string {
  const mode = safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop' ? 'safety' : 'normal';
  return localizedMediatorText(language, mode);
}

/** Creates a safe fallback DraftMediatorReply. */
export function createFallbackMediatorReply(
  language: MediatorLang,
  safetyLevel: SafetyLevel,
  turnNumber: TurnNumber,
  invalidReasons: string[] = []
): DraftMediatorReply {
  const text = fallbackText(language, safetyLevel);
  const questionCount = countQuestions(text);
  const sentenceCount = countSentences(text);
  const lengthChars = text.length;

  return {
    text,
    language,
    safetyLevel,
    source: 'fallback',
    validation: {
      valid: true,
      reasons: invalidReasons.length > 0 ? [`Fallback used: ${invalidReasons.join('; ')}`] : [],
      blockedTermsFound: [],
      questionCount,
      sentenceCount,
      lengthChars,
      safetyCompliant: true,
    },
    metadata: {
      turnNumber,
      providerId: 'fallback',
      model: 'fallback',
      generatedAt: new Date().toISOString(),
    },
  };
}

export {
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
  LLM_LIMITS,
};
