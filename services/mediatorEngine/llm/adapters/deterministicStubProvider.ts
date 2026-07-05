import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse, MediatorLang } from '@/types/mediator';
import {
  localizedMediatorText,
  LOCALIZED_NORMAL_TEXT,
  LOCALIZED_SAFETY_TEXT,
} from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';

function isSafetyActive(safetyLevel: string): boolean {
  return safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';
}

function stubText(language: MediatorLang, safety: boolean): string {
  const mode = safety ? 'safety' : 'normal';
  return localizedMediatorText(language, mode);
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
  LOCALIZED_NORMAL_TEXT as STUB_NORMAL_BY_LANG,
  LOCALIZED_SAFETY_TEXT as STUB_SAFETY_BY_LANG,
};
