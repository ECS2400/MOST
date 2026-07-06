import assert from 'node:assert/strict';
import type {
  LlmProviderPort,
  MediatorLang,
  MediatorRuntimeEdgeSuccess,
  TranscriptMessage,
} from '@/types/mediator';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import { isMediatorRuntimeResponseSafe } from '@/services/mediatorEngine/edge/response';
import { isRuntimeMetadataTranscriptSafe } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';
import {
  loadOpenAiApiKey,
  loadOpenAiModel,
  loadOpenAiTimeoutMs,
  PRODUCTION_API_KEY,
} from '@/services/mediatorEngine/__tests__/production/loadEnv';

export const PRIVATE_MARKERS = {
  email: 'prod.qa.user@private-example.org',
  phone: '+48-555-123-4567',
  address: '742 Evergreen Terrace, Springfield',
  messageId: 'prod-priv-msg-001',
  sessionId: 'prod-priv-session-001',
  mediationId: 'prod-priv-mediation-001',
} as const;

let turnCounter = 0;

export function nextTurnId(prefix: string): string {
  turnCounter += 1;
  return `${prefix}-${turnCounter}`;
}

export function resetTurnCounter(): void {
  turnCounter = 0;
}

export interface ProductionRequestOptions {
  language?: MediatorLang;
  turnNumber?: number;
  trigger?: 'session_start' | 'partner_message' | 'host_generate' | 'resume_after_pause';
  mediationState?: ReturnType<typeof createBaselineMediationState> | null;
  sessionMemory?: ReturnType<typeof createEmptySessionMemory> | null;
  transcriptDelta?: TranscriptMessage[];
  mediationId?: string;
  sessionId?: string;
}

export function createProductionRequestBody(options: ProductionRequestOptions = {}) {
  const mediationId = options.mediationId ?? 'prod-mediation-qa';
  const sessionId = options.sessionId ?? 'prod-session-qa';

  return {
    mediationId,
    sessionId,
    turnNumber: options.turnNumber ?? 1,
    trigger: options.trigger ?? 'partner_message',
    mediationState: options.mediationState ?? null,
    sessionMemory: options.sessionMemory ?? null,
    transcriptDelta: options.transcriptDelta ?? [],
    language: options.language ?? 'en',
    engineVersion: 'v2.3' as const,
  };
}

export function transcriptMessage(
  content: string,
  overrides: Partial<TranscriptMessage> = {}
): TranscriptMessage {
  return {
    id: overrides.id ?? nextTurnId('prod-msg'),
    authorRole: overrides.authorRole ?? 'partner',
    content,
    turnNumber: overrides.turnNumber ?? 1,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  };
}

export function buildLongTranscript(count: number): TranscriptMessage[] {
  const lines = [
    'I still feel we are not on the same page about finances.',
    'Every time I bring it up you shut down.',
    'I am trying to understand your perspective.',
    'It hurts when you say I am overreacting.',
    'We keep circling the same argument.',
    'I want us to find a calmer way to talk.',
    'Maybe we both need a pause before continuing.',
    'I notice my voice gets louder when I feel ignored.',
    'Can we agree to listen without interrupting?',
    'I appreciate when you acknowledge my effort.',
  ];

  return Array.from({ length: count }, (_, index) => {
    const turn = Math.floor(index / 2) + 1;
    return transcriptMessage(lines[index % lines.length]!, {
      id: `long-msg-${index + 1}`,
      authorRole: index % 2 === 0 ? 'host' : 'partner',
      turnNumber: turn,
    });
  });
}

export function createBreakthroughState(language: MediatorLang = 'en') {
  const base = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language,
      currentTurnNumber: 5,
    },
    dynamics: {
      ...createBaselineMediationState().dynamics,
      breakthroughDetected: true,
      mutualUnderstandingScore: 75,
    },
  });
  return base;
}

export function createRecoveryState(language: MediatorLang = 'en') {
  const base = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language,
      currentTurnNumber: 4,
    },
    recovery: {
      active: true,
      trigger: 'explicit_correction',
      triggerQuote: '[redacted]',
      confidence: 85,
      startedAtTurn: 3,
      recoveryAttempt: 1,
      affectedCheckIds: [],
      affectedFields: [],
    },
  });
  return base;
}

export interface RunProductionTurnOptions {
  llmProviderOverride?: LlmProviderPort;
  expectedProviderId?: string;
}

/** Executes one production turn via handleMediatorRuntimeTurn with real OpenAI by default. */
export async function runProductionTurn(
  body: ReturnType<typeof createProductionRequestBody>,
  options: RunProductionTurnOptions = {}
) {
  const apiKey = PRODUCTION_API_KEY ?? loadOpenAiApiKey();
  assert.ok(apiKey, 'OPENAI_API_KEY is required for production E2E tests');

  const result = await handleMediatorRuntimeTurn(body, {
    llmProviderOverride: options.llmProviderOverride,
    env: {
      openAiApiKey: apiKey,
      openAiModel: loadOpenAiModel(),
      openAiTimeoutMs: String(loadOpenAiTimeoutMs()),
    },
  });

  return result;
}

export interface AssertProductionTurnOptions {
  expectedLanguage: MediatorLang;
  expectedTurnNumber?: number;
  expectedProviderId?: string;
  minSafetyLevel?: 'none' | 'L1_gentle' | 'L2_pause' | 'L3_stop';
  requireCompliant?: boolean;
  requireAccepted?: boolean;
  requireLlmSource?: boolean;
  privateMarkers?: readonly string[];
}

const SAFETY_RANK: Record<string, number> = {
  none: 0,
  L1_gentle: 1,
  L2_pause: 2,
  L3_stop: 3,
};

/** Validates the full production turn contract shared by all E2E scenarios. */
export function assertProductionTurn(
  result: Awaited<ReturnType<typeof runProductionTurn>>,
  options: AssertProductionTurnOptions
): asserts result is MediatorRuntimeEdgeSuccess {
  assert.equal(result.ok, true, `Expected HTTP success, got: ${JSON.stringify(result)}`);

  const {
    expectedLanguage,
    expectedTurnNumber,
    expectedProviderId = 'openai',
    minSafetyLevel = 'none',
    requireCompliant = true,
    requireAccepted = true,
    requireLlmSource = false,
    privateMarkers = [],
  } = options;

  assert.equal(result.engineVersion, 'v2.3');
  assert.ok(result.finalMediatorMessage.text.trim().length > 0, 'finalMediatorMessage.text empty');
  assert.equal(result.finalMediatorMessage.language, expectedLanguage);
  assert.equal(typeof result.finalMediatorMessage.accepted, 'boolean');
  assert.ok(
    result.finalMediatorMessage.validationAction === 'accept' ||
      result.finalMediatorMessage.validationAction === 'fallback' ||
      result.finalMediatorMessage.validationAction === 'retry'
  );

  if (requireAccepted) {
    assert.equal(result.finalMediatorMessage.accepted, true);
  }

  if (requireLlmSource) {
    assert.equal(
      result.finalMediatorMessage.source,
      'llm',
      'Expected live OpenAI reply (source=llm); got fallback — verify OPENAI_API_KEY'
    );
  }

  assert.equal(typeof result.complianceResult.compliant, 'boolean');
  if (requireCompliant) {
    assert.equal(result.complianceResult.compliant, true);
  }

  assert.equal(typeof result.responseValidation.valid, 'boolean');
  assert.ok(result.responseValidation.action.length > 0);
  assert.ok(Array.isArray(result.responseValidation.blockingReasons));
  assert.ok(Array.isArray(result.responseValidation.warningReasons));
  assert.ok(result.responseValidation.validatedAt.length > 0);

  assert.ok(result.runtimeMetadata);
  assert.equal(result.runtimeMetadata.engineVersion, 'v2.3');
  if (expectedTurnNumber !== undefined) {
    assert.equal(result.runtimeMetadata.turnNumber, expectedTurnNumber);
  } else {
    assert.ok(result.runtimeMetadata.turnNumber >= 1);
  }
  assert.ok(!Number.isNaN(Date.parse(result.runtimeMetadata.startedAt)));
  assert.ok(!Number.isNaN(Date.parse(result.runtimeMetadata.completedAt)));
  assert.ok(result.runtimeMetadata.durationMs >= 0);
  assert.equal(result.runtimeMetadata.providerId, expectedProviderId);
  assert.equal(typeof result.runtimeMetadata.retryCount, 'number');

  const actualRank = SAFETY_RANK[result.finalMediatorMessage.safetyLevel] ?? 0;
  const minRank = SAFETY_RANK[minSafetyLevel] ?? 0;
  assert.ok(
    actualRank >= minRank,
    `Expected safety >= ${minSafetyLevel}, got ${result.finalMediatorMessage.safetyLevel}`
  );

  assert.equal(isRuntimeMetadataTranscriptSafe(result.runtimeMetadata), true);
  assertProductionEdgeResponseSafe(result);

  const serialized = JSON.stringify(result);
  for (const marker of privateMarkers) {
    assert.ok(!serialized.includes(marker), `Private marker leaked into response: ${marker}`);
    assert.ok(
      !result.finalMediatorMessage.text.includes(marker),
      `Private marker leaked into final text: ${marker}`
    );
  }
}

/** Ensures edge response never exposes prompts, provider payloads, or token usage. */
export function assertProductionEdgeResponseSafe(result: MediatorRuntimeEdgeSuccess): void {
  assert.equal(isMediatorRuntimeResponseSafe(result), true);

  const forbiddenTopLevel = [
    'promptComposerOutput',
    'llmOutput',
    'providerResponse',
    'orchestratedTurn',
    'tokenUsage',
  ] as const;

  for (const key of forbiddenTopLevel) {
    assert.ok(!(key in (result as Record<string, unknown>)), `Forbidden top-level key: ${key}`);
  }

  const serialized = JSON.stringify(result);
  const forbiddenSnippets = [
    'providerResponse',
    'systemPrompt',
    'developerPrompt',
    'userPrompt',
    'retryInstruction',
    'promptTokens',
    'completionTokens',
    'totalTokens',
    'tokenUsage',
    '"draftReply"',
    '"validatedReply"',
    '"fallbackReply"',
  ];

  for (const snippet of forbiddenSnippets) {
    assert.ok(!serialized.includes(snippet), `Forbidden snippet in edge response: ${snippet}`);
  }
}
