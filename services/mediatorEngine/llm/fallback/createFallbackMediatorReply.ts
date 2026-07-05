import type { DraftMediatorReply, MediatorLang, SafetyLevel, TurnNumber } from '@/types/mediator';
import { LLM_LIMITS } from '@/services/mediatorEngine/llm/config/llmLimits';
import { countQuestions, countSentences } from '@/services/mediatorEngine/llm/validate/validateSafetyReply';

const FALLBACK_TEXT_EN: Record<'normal' | 'safety', string> = {
  normal:
    'I hear that this is difficult for both of you. Let us take a moment and speak one at a time.',
  safety:
    'I want to pause here for safety. Please take a slow breath. We can stop and step back before continuing.',
};

const FALLBACK_TEXT_PL: Record<'normal' | 'safety', string> = {
  normal:
    'Słyszę, że to jest trudne dla was obojga. Zatrzymajmy się na chwilę i mówcie po kolei.',
  safety:
    'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech. Możemy zatrzymać rozmowę i wrócić do niej dopiero wtedy, gdy będzie spokojniej.',
};

function fallbackText(language: MediatorLang, safetyLevel: SafetyLevel): string {
  const mode = safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop' ? 'safety' : 'normal';
  if (language === 'pl') return FALLBACK_TEXT_PL[mode];
  return FALLBACK_TEXT_EN[mode];
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

export { FALLBACK_TEXT_EN, FALLBACK_TEXT_PL, LLM_LIMITS };
