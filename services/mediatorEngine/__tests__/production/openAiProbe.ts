import { createOpenAiLlmProvider } from '@/services/mediatorEngine/llm/adapters/openAiLlmProvider';
import {
  loadOpenAiApiKey,
  loadOpenAiModel,
  loadOpenAiTimeoutMs,
} from '@/services/mediatorEngine/__tests__/production/loadEnv';

let cachedLiveOpenAi: boolean | null = null;

/**
 * Probes whether OPENAI_API_KEY can produce a live completion.
 * Cached for the process — used to report live vs fallback-only runs.
 */
export async function probeLiveOpenAiAvailable(): Promise<boolean> {
  if (cachedLiveOpenAi !== null) return cachedLiveOpenAi;

  const apiKey = loadOpenAiApiKey();
  if (!apiKey) {
    cachedLiveOpenAi = false;
    return false;
  }

  try {
    const provider = createOpenAiLlmProvider({
      apiKey,
      model: loadOpenAiModel(),
      timeoutMs: loadOpenAiTimeoutMs(),
    });

    const response = await provider.generateText({
      systemPrompt: 'You are a concise assistant.',
      developerPrompt: 'Reply with one short sentence.',
      userPrompt: 'Say hello.',
      modelHints: {
        temperature: 0,
        maxOutputTokens: 16,
        style: 'calm',
        responseFormat: 'plain_text',
      },
      metadata: {
        turnNumber: 1,
        language: 'en',
        safetyLevel: 'none',
        interventionType: 'reflect',
        goal: 'SAFE_OPENING',
      },
    });

    cachedLiveOpenAi = Boolean(response.text?.trim());
  } catch {
    cachedLiveOpenAi = false;
  }

  return cachedLiveOpenAi;
}

export function resetLiveOpenAiProbeCache(): void {
  cachedLiveOpenAi = null;
}
