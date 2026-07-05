import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse } from '@/types/mediator';
import {
  OPENAI_PROVIDER_DEFAULTS,
  resolveOpenAiProviderConfig,
  type OpenAiLlmProviderConfig,
} from '@/services/mediatorEngine/llm/adapters/providerConfig';
import {
  LlmProviderEmptyResponseError,
  LlmProviderHttpError,
  LlmProviderMalformedResponseError,
  LlmProviderTimeoutError,
  MissingLlmApiKeyError,
} from '@/services/mediatorEngine/llm/adapters/providerErrors';

interface OpenAiChatCompletionBody {
  model: string;
  messages: Array<{ role: 'system' | 'developer' | 'user'; content: string }>;
  temperature: number;
  max_tokens: number;
}

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function buildRequestBody(request: LlmProviderRequest, model: string): OpenAiChatCompletionBody {
  return {
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'developer', content: request.developerPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    temperature: request.modelHints.temperature,
    max_tokens: request.modelHints.maxOutputTokens,
  };
}

function mapFinishReason(value: string | null | undefined): LlmProviderResponse['finishReason'] {
  if (value === 'stop') return 'stop';
  if (value === 'length') return 'length';
  if (value === 'error') return 'error';
  return 'unknown';
}

function parseOpenAiResponse(
  payload: unknown,
  model: string,
  latencyMs: number
): LlmProviderResponse {
  if (!payload || typeof payload !== 'object') {
    throw new LlmProviderMalformedResponseError('response is not an object');
  }

  const body = payload as OpenAiChatCompletionResponse;
  const choice = body.choices?.[0];

  if (!choice) {
    throw new LlmProviderMalformedResponseError('missing choices[0]');
  }

  const text = typeof choice.message?.content === 'string' ? choice.message.content.trim() : '';

  if (!text) {
    throw new LlmProviderEmptyResponseError();
  }

  const usage = body.usage;
  const tokenUsage =
    usage &&
    typeof usage.prompt_tokens === 'number' &&
    typeof usage.completion_tokens === 'number' &&
    typeof usage.total_tokens === 'number'
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined;

  return {
    text,
    provider: 'openai',
    model,
    latencyMs,
    finishReason: mapFinishReason(choice.finish_reason),
    tokenUsage,
  };
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmProviderTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Production OpenAI-compatible LLM provider — no secrets, no logging, injectable fetch. */
export function createOpenAiLlmProvider(config: OpenAiLlmProviderConfig = {}): LlmProviderPort {
  const resolved = resolveOpenAiProviderConfig(config);

  return {
    providerId: OPENAI_PROVIDER_DEFAULTS.providerId,
    async generateText(request: LlmProviderRequest): Promise<LlmProviderResponse> {
      if (!resolved.apiKey || resolved.apiKey.trim().length === 0) {
        throw new MissingLlmApiKeyError();
      }

      const startedAt = Date.now();
      const body = buildRequestBody(request, resolved.model);

      const response = await fetchWithTimeout(
        resolved.fetchImpl,
        resolved.endpoint,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resolved.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        resolved.timeoutMs
      );

      if (!response.ok) {
        throw new LlmProviderHttpError(
          response.status,
          `OpenAI LLM provider HTTP ${response.status}`
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new LlmProviderMalformedResponseError('invalid JSON body');
      }

      return parseOpenAiResponse(payload, resolved.model, Math.max(0, Date.now() - startedAt));
    },
  };
}

export type { OpenAiLlmProviderConfig };
export { buildRequestBody, parseOpenAiResponse };
