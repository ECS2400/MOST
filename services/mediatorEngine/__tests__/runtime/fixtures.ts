import type { LlmProviderPort, MediatorRuntimeInput, OrchestrateTurnRequest, TranscriptMessage } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { messageWithContent } from '@/services/mediatorEngine/__tests__/safety/fixtures';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';

export function createRuntimeTurnInput(
  overrides: Partial<OrchestrateTurnRequest> = {}
): OrchestrateTurnRequest {
  const state = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language: 'en',
    },
  });

  return {
    mediationId: 'runtime-mediation-1',
    sessionId: 'runtime-session-1',
    trigger: 'partner_message',
    turnNumber: 3,
    mediationState: state,
    transcriptDelta: [
      {
        id: 'rt-msg-1',
        authorRole: 'partner',
        content: 'I feel unheard when plans change without notice.',
        turnNumber: 3,
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ],
    engineVersion: 'v2.3',
    ...overrides,
  };
}

export function createRuntimeInput(
  overrides: Partial<MediatorRuntimeInput> = {}
): MediatorRuntimeInput {
  return {
    turnInput: overrides.turnInput ?? createRuntimeTurnInput(),
    sessionMemory: overrides.sessionMemory ?? createEmptySessionMemory(),
    maxReplyAttempts: overrides.maxReplyAttempts ?? RUNTIME_LIMITS.defaultMaxReplyAttempts,
    language: overrides.language ?? 'en',
    llmProvider: overrides.llmProvider ?? createDeterministicStubProvider(),
    ...overrides,
  };
}

export function createL3RuntimeInput(
  transcript: TranscriptMessage[] = messageWithContent('I want to kill myself')
): MediatorRuntimeInput {
  return createRuntimeInput({
    turnInput: createRuntimeTurnInput({ transcriptDelta: transcript }),
    language: 'en',
  });
}

/** Provider: first call Polish text (language mismatch for EN), second call valid EN. */
export function createLanguageRetryProvider(): LlmProviderPort {
  let calls = 0;
  return {
    providerId: 'fake-llm',
    async generateText(request) {
      calls += 1;
      const text =
        calls === 1
          ? 'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech.'
          : 'I hear that this feels heavy for both of you. Let us speak one at a time.';
      return {
        text,
        provider: 'fake-llm',
        model: 'fake-model-v1',
        latencyMs: 1,
        finishReason: 'stop',
      };
    },
  };
}

export { createFakeLlmProvider, createDeterministicStubProvider, RUNTIME_LIMITS };
