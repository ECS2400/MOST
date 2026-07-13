import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse, MediatorLang } from '@/types/mediator';
import {
  localizedMediatorText,
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';

function isSafetyActive(safetyLevel: string): boolean {
  return safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';
}

const EXPLORATION_STUB_TEXT: Record<MediatorLang, string> = {
  pl: 'Opowiedzcie proszę, co każde z was widzi inaczej w tej sytuacji — jednym zdaniem.',
  en: 'Please share, in one sentence each, what each of you sees differently in this moment.',
  es: 'Por favor, compartan en una frase qué ve cada uno de forma distinta en este momento.',
  it: 'Per favore, condividete in una frase cosa vede ciascuno in modo diverso in questo momento.',
  de: 'Bitte schildern Sie in jeweils einem Satz, was jede Seite in dieser Situation anders sieht.',
  fr: 'Merci de partager en une phrase ce que chacun voit différemment dans cette situation.',
};

function stubText(language: MediatorLang, safety: boolean): string {
  if (safety) {
    return localizedMediatorText(language, 'safety');
  }
  return EXPLORATION_STUB_TEXT[language] ?? EXPLORATION_STUB_TEXT.en;
}

/** Deterministic stub provider — no network, safety-aware output for all 6 languages. */
export function createDeterministicStubProvider(): LlmProviderPort {
  return {
    providerId: 'deterministic-stub',
    async generateText(request: LlmProviderRequest): Promise<LlmProviderResponse> {
      const { safetyLevel, language } = request.metadata;
      const text = stubText(language, isSafetyActive(safetyLevel));

      return {
        text,
        provider: 'deterministic-stub',
        model: 'stub-v1',
        latencyMs: 1,
        finishReason: 'stop',
      };
    },
  };
}

export {
  EXPLORATION_STUB_TEXT,
  LOCALIZED_NORMAL_TEXT as STUB_NORMAL_BY_LANG,
  LOCALIZED_SAFETY_TEXT as STUB_SAFETY_BY_LANG,
};
