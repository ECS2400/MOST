import assert from 'node:assert/strict';
import type {
  LlmProviderPort,
  MediatorRuntimeInput,
  MediatorRuntimeOutput,
  OrchestrateTurnRequest,
  TranscriptMessage,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { messageWithContent } from '@/services/mediatorEngine/__tests__/safety/fixtures';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';
import { FORBIDDEN_RESPONSE_TERMS } from '@/services/mediatorEngine/responseValidator/config/forbiddenResponseTerms';
import { CONFLICT_ESCALATION_PHRASES } from '@/services/mediatorEngine/llm/config/forbiddenLlmOutput';
import { isRuntimeMetadataTranscriptSafe } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';

export const PRIVATE_MARKERS = {
  email: 'priv.user@secret-domain.com',
  phone: '+1-555-987-6543',
  messageId: 'priv-msg-id-778899',
  sessionId: 'priv-session-991122',
  mediationId: 'priv-mediation-334455',
} as const;

export function createIntegrationTurnInput(
  overrides: Partial<OrchestrateTurnRequest> = {}
): OrchestrateTurnRequest {
  const state = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language: 'en',
    },
  });

  return {
    mediationId: 'integration-mediation-1',
    sessionId: 'integration-session-1',
    trigger: 'partner_message',
    turnNumber: 3,
    mediationState: state,
    transcriptDelta: [
      {
        id: 'int-msg-1',
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

export function createIntegrationInput(
  overrides: Partial<MediatorRuntimeInput> = {}
): MediatorRuntimeInput {
  return {
    turnInput: overrides.turnInput ?? createIntegrationTurnInput(),
    sessionMemory: overrides.sessionMemory ?? createEmptySessionMemory(),
    maxReplyAttempts: overrides.maxReplyAttempts ?? RUNTIME_LIMITS.defaultMaxReplyAttempts,
    language: overrides.language ?? 'en',
    llmProvider: overrides.llmProvider ?? createDeterministicStubProvider(),
    ...overrides,
  };
}

export function createTranscriptWithContent(content: string): TranscriptMessage[] {
  return messageWithContent(content, { id: 'int-msg-1', turnNumber: 3 });
}

/** Provider: first call invalid (language mismatch), second call valid EN. */
export function createRetryAfterInvalidProvider(): LlmProviderPort {
  let calls = 0;
  return {
    providerId: 'fake-llm',
    async generateText() {
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

/** Provider: always returns language-mismatched text to force fallback after max attempts. */
export function createAlwaysInvalidProvider(): LlmProviderPort {
  return createFakeLlmProvider({
    fixedText:
      'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech.',
    language: 'pl',
  });
}

/** Provider: returns forbidden pipeline/json output (LLM-level invalid). */
export function createInvalidOutputProvider(): LlmProviderPort {
  return createFakeLlmProvider({
    fixedText: 'The pipeline suggests we use the json strategy engine output here.',
  });
}

export function assertFinalMessageAccepted(result: MediatorRuntimeOutput): void {
  assert.equal(result.finalMediatorMessage.accepted, true);
  assert.ok(result.finalMediatorMessage.text.length > 0);
}

export function assertNoForbiddenTerms(text: string): void {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_RESPONSE_TERMS) {
    assert.ok(!lower.includes(term.toLowerCase()), `Forbidden term leaked: ${term}`);
  }
}

export function assertNoBlameOrDiagnosis(text: string): void {
  const lower = text.toLowerCase();
  const blamePatterns = [
    /\b(diagnos|diagnosis|clinical disorder|narcissist|personality disorder)\b/i,
    /\b(your fault|at fault|to blame|you are wrong|you're wrong)\b/i,
    /\b(moraliz|shame on you|you should be ashamed)\b/i,
  ];
  for (const pattern of blamePatterns) {
    assert.ok(!pattern.test(text), `Blame/diagnosis pattern matched: ${pattern}`);
  }
  for (const phrase of CONFLICT_ESCALATION_PHRASES) {
    assert.ok(!lower.includes(phrase.toLowerCase()), `Escalation phrase leaked: ${phrase}`);
  }
}

export function assertNoPrivateLeak(
  result: MediatorRuntimeOutput,
  markers: readonly string[] = Object.values(PRIVATE_MARKERS)
): void {
  const safePayload = {
    finalText: result.finalMediatorMessage.text,
    runtimeMetadata: result.runtimeMetadata,
    responseValidation: result.responseValidation,
    llmMetadata: result.llmOutput.draftReply.metadata,
    llmText: result.llmOutput.draftReply.text,
  };
  const serialized = JSON.stringify(safePayload);

  for (const marker of markers) {
    assert.ok(!serialized.includes(marker), `Private marker leaked: ${marker}`);
  }

  assert.equal(isRuntimeMetadataTranscriptSafe(result.runtimeMetadata), true);
}

export {
  createFakeLlmProvider,
  createDeterministicStubProvider,
  RUNTIME_LIMITS,
};
