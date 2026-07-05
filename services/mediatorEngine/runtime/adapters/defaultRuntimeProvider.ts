import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import type { LlmProviderPort } from '@/types/mediator';

/** Returns the default runtime LLM provider (deterministic stub). */
export function createDefaultRuntimeProvider(): LlmProviderPort {
  return createDeterministicStubProvider();
}

export { createDeterministicStubProvider };
