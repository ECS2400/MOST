import type { LlmProviderPort, LlmProviderRequest } from '@/types/mediator';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { LlmProviderTimeoutError } from '@/services/mediatorEngine/llm/adapters/providerErrors';

/** Simulates provider hard failure — runtime should fallback. */
export function createProductionFailureProvider(): LlmProviderPort {
  return createFakeLlmProvider({ simulateError: true });
}

/** Simulates provider timeout — runtime should fallback. */
export function createProductionTimeoutProvider(timeoutMs = 25): LlmProviderPort {
  return {
    providerId: 'fake-timeout',
    async generateText(_request: LlmProviderRequest) {
      await new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new LlmProviderTimeoutError('Simulated production timeout'));
        }, timeoutMs);
      });
      throw new LlmProviderTimeoutError('Simulated production timeout');
    },
  };
}

/** Simulates invalid/forbidden LLM output — runtime should retry then fallback. */
export function createProductionInvalidOutputProvider(): LlmProviderPort {
  return createFakeLlmProvider({
    fixedText:
      'The json pipeline orchestrator selected strategy engine output with systemPrompt leakage.',
  });
}