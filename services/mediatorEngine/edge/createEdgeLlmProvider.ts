import type { LlmProviderPort } from '@/types/mediator';
import { createOpenAiLlmProvider } from '@/services/mediatorEngine/llm/adapters/openAiLlmProvider';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import type { MediatorRuntimeEdgeEnv } from '@/services/mediatorEngine/edge/types';

export interface CreateEdgeLlmProviderOptions {
  env: MediatorRuntimeEdgeEnv;
  /** Test-only override — skips OpenAI and env lookup when set. */
  llmProviderOverride?: LlmProviderPort;
  fetchImpl?: typeof fetch;
}

export type CreateEdgeLlmProviderResult =
  | { ok: true; provider: LlmProviderPort }
  | { ok: false; reason: 'missing_openai_api_key' };

/**
 * Resolves the LLM provider for Edge runtime.
 *
 * Production: requires OPENAI_API_KEY via env (injected by Supabase secrets).
 * Tests: pass llmProviderOverride (stub/fake) to avoid network and secrets.
 */
export function createEdgeLlmProvider(
  options: CreateEdgeLlmProviderOptions
): CreateEdgeLlmProviderResult {
  if (options.llmProviderOverride) {
    return { ok: true, provider: options.llmProviderOverride };
  }

  const apiKey = options.env.openAiApiKey?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'missing_openai_api_key' };
  }

  const timeoutRaw = options.env.openAiTimeoutMs;
  const timeoutMs =
    timeoutRaw && Number.isFinite(Number(timeoutRaw)) ? Number(timeoutRaw) : 30_000;

  return {
    ok: true,
    provider: createOpenAiLlmProvider({
      apiKey,
      model: options.env.openAiModel?.trim() || 'gpt-4o-mini',
      timeoutMs,
      fetchImpl: options.fetchImpl ?? fetch,
    }),
  };
}

/** Stub provider for local/dev tests without OpenAI credentials. */
export function createEdgeStubProvider(): LlmProviderPort {
  return createDeterministicStubProvider();
}
