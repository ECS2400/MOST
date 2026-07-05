import type { MediatorRuntimeInput } from '@/types/mediator';
import {
  createAlwaysInvalidProvider,
  createFakeLlmProvider,
  createIntegrationInput,
  createInvalidOutputProvider,
  createRetryAfterInvalidProvider,
  RUNTIME_LIMITS,
} from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const providerErrorInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  llmProvider: createFakeLlmProvider({ simulateError: true }),
});

export const invalidOutputInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  llmProvider: createInvalidOutputProvider(),
});

export const retryInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  llmProvider: createRetryAfterInvalidProvider(),
  maxReplyAttempts: 2,
});

export const maxAttemptsFallbackInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  llmProvider: createAlwaysInvalidProvider(),
  maxReplyAttempts: RUNTIME_LIMITS.defaultMaxReplyAttempts,
});
