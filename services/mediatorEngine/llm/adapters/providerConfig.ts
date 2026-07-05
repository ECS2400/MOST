/** Default configuration for the OpenAI LLM provider adapter. */
export const OPENAI_PROVIDER_DEFAULTS = {
  model: 'gpt-4o-mini',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  timeoutMs: 30_000,
  providerId: 'openai',
} as const;

export interface OpenAiLlmProviderConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Resolves provider config with safe defaults — never reads process.env. */
export function resolveOpenAiProviderConfig(
  config: OpenAiLlmProviderConfig = {}
): Required<Pick<OpenAiLlmProviderConfig, 'model' | 'endpoint' | 'timeoutMs'>> &
  Pick<OpenAiLlmProviderConfig, 'apiKey' | 'fetchImpl'> {
  return {
    apiKey: config.apiKey,
    model: config.model ?? OPENAI_PROVIDER_DEFAULTS.model,
    endpoint: config.endpoint ?? OPENAI_PROVIDER_DEFAULTS.endpoint,
    timeoutMs: config.timeoutMs ?? OPENAI_PROVIDER_DEFAULTS.timeoutMs,
    fetchImpl: config.fetchImpl ?? fetch,
  };
}
