import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { composeRuntimeSession } from '@/services/mediatorEngine/runtimeSession';

export function createMinimalRuntimeSuccess(
  overrides: Partial<MediatorRuntimeEdgeSuccess> = {}
): MediatorRuntimeEdgeSuccess {
  const mediationState = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language: 'en',
    },
  });

  const finalMediatorMessage = {
    text: 'What would help you feel heard in this moment?',
    source: 'stub' as const,
    safetyLevel: 'none' as const,
    language: 'en' as const,
    turnNumber: 3,
    accepted: true,
    validationAction: 'accept' as const,
  };

  const sessionMemory = createEmptySessionMemory();

  const intervention = {
    id: 'int-1',
    type: 'open_deepen' as const,
    target: 'both' as const,
    visibility: 'public' as const,
    content: {
      primaryMessage: 'What would help you feel heard in this moment?',
    },
    goal: 'EMOTION_NAMING' as const,
    intent: 'help_name_emotion' as const,
    strategy: 'validate_emotions' as const,
    rationale: 'test',
    expectedEffect: {
      id: 'eff-1',
      description: 'test',
      observableSignals: [],
      targetParticipant: 'both' as const,
      verificationMethod: 'next_message' as const,
      successCriteria: {
        type: 'check_confirmed' as const,
        threshold: 1,
        confidenceRequired: 50,
      },
      timeHorizon: 1,
    },
    libraryPatternId: null,
    signature: 'sig-1',
    generatedAt: '2026-07-06T00:00:00.000Z',
  };

  const runtimeMetadata = {
    engineVersion: 'v2.3',
    turnNumber: 3,
    startedAt: '2026-07-06T00:00:00.000Z',
    completedAt: '2026-07-06T00:00:01.000Z',
    durationMs: 1000,
    providerId: 'deterministic-stub',
    retryCount: 0,
  };

  const fallbackUsed = false;

  const base: MediatorRuntimeEdgeSuccess = {
    ok: true,
    engineVersion: 'v2.3',
    finalMediatorMessage,
    mediationState,
    sessionMemory,
    intervention,
    complianceResult: {
      compliant: true,
      violations: [],
      attemptNumber: 1,
      fallbackUsed: false,
      validatedAt: '2026-07-06T00:00:00.000Z',
      validatorLayer: 'deterministic',
    },
    responseValidation: {
      valid: true,
      action: 'accept',
      blockingReasons: [],
      warningReasons: [],
      validatedAt: '2026-07-06T00:00:00.000Z',
    },
    runtimeMetadata,
    fallbackUsed,
    retryCount: 0,
    runtimeSession: composeRuntimeSession({
      mediationState,
      sessionMemory,
      intervention,
      finalMediatorMessage,
      runtimeMetadata,
      fallbackUsed,
    }),
  };

  const merged = {
    ...base,
    ...overrides,
    finalMediatorMessage: {
      ...base.finalMediatorMessage,
      ...(overrides.finalMediatorMessage ?? {}),
    },
    mediationState: overrides.mediationState ?? base.mediationState,
    sessionMemory: overrides.sessionMemory ?? base.sessionMemory,
    intervention: {
      ...base.intervention,
      ...(overrides.intervention ?? {}),
    },
    runtimeMetadata: {
      ...base.runtimeMetadata,
      ...(overrides.runtimeMetadata ?? {}),
    },
  };

  if (overrides.runtimeSession) {
    return merged as MediatorRuntimeEdgeSuccess;
  }

  return {
    ...merged,
    runtimeSession: composeRuntimeSession({
      mediationState: merged.mediationState,
      sessionMemory: merged.sessionMemory,
      intervention: merged.intervention,
      finalMediatorMessage: merged.finalMediatorMessage,
      runtimeMetadata: merged.runtimeMetadata,
      fallbackUsed: merged.fallbackUsed,
    }),
  };
}

export function createClientInputFixture() {
  return {
    mediationId: 'med-1',
    sessionId: 'sess-1',
    turnNumber: 3,
    trigger: 'partner_message' as const,
    mediationState: null,
    sessionMemory: null,
    transcriptDelta: [
      {
        id: 'msg-1',
        authorRole: 'partner' as const,
        content: 'I feel unheard.',
        turnNumber: 3,
        createdAt: '2026-07-06T00:00:00.000Z',
      },
    ],
    language: 'en' as const,
  };
}
