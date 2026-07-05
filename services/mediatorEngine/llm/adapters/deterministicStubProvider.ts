import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse } from '@/types/mediator';

const STUB_NORMAL_EN =
  'I hear that this feels heavy for both of you. Let us speak one at a time, without rush.';

const STUB_NORMAL_PL =
  'Słyszę, że oboje jest wam teraz ciężko. Mówmy po kolei, bez pośpiechu.';

const STUB_SAFETY_EN =
  'I need to pause here for safety. Please take a slow breath together before we continue.';

const STUB_SAFETY_PL =
  'Chcę zatrzymać mediację na chwilę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech.';

function isSafetyActive(safetyLevel: string): boolean {
  return safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';
}

/** Deterministic stub provider — no network, safety-aware output. */
export function createDeterministicStubProvider(): LlmProviderPort {
  return {
    providerId: 'deterministic-stub',
    async generateText(request: LlmProviderRequest): Promise<LlmProviderResponse> {
      const { safetyLevel, language } = request.metadata;
      const safety = isSafetyActive(safetyLevel);

      let text: string;
      if (safety) {
        text = language === 'pl' ? STUB_SAFETY_PL : STUB_SAFETY_EN;
      } else {
        text = language === 'pl' ? STUB_NORMAL_PL : STUB_NORMAL_EN;
      }

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

export { STUB_NORMAL_EN, STUB_NORMAL_PL, STUB_SAFETY_EN, STUB_SAFETY_PL };
