import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse, MediatorLang } from '@/types/mediator';

export interface FakeLlmProviderOptions {
  /** Fixed text returned on every call. */
  fixedText?: string;
  /** Default language for generated text when fixedText is not set. */
  language?: MediatorLang;
  /** When true, generateText throws. */
  simulateError?: boolean;
  /** When true, returns empty text. */
  simulateEmpty?: boolean;
  /** Captures the last request for test assertions. */
  onRequest?: (request: LlmProviderRequest) => void;
}

const DEFAULT_TEXT_EN =
  'I hear this matters to both of you. What feels hardest for you right now?';

const DEFAULT_TEXT_PL =
  'Słyszę, że to ważne dla was obu. Co teraz jest dla was najtrudniejsze?';

/** Fake LLM provider for tests — predictable, no network. */
export function createFakeLlmProvider(options: FakeLlmProviderOptions = {}): LlmProviderPort {
  return {
    providerId: 'fake-llm',
    async generateText(request: LlmProviderRequest): Promise<LlmProviderResponse> {
      options.onRequest?.(request);

      if (options.simulateError) {
        throw new Error('Simulated provider error');
      }

      const lang = options.language ?? request.metadata.language;
      const text =
        options.fixedText ??
        (lang === 'pl' ? DEFAULT_TEXT_PL : DEFAULT_TEXT_EN);

      return {
        text: options.simulateEmpty ? '' : text,
        provider: 'fake-llm',
        model: 'fake-model-v1',
        latencyMs: 5,
        finishReason: 'stop',
        tokenUsage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
      };
    },
  };
}

export { DEFAULT_TEXT_EN, DEFAULT_TEXT_PL };
