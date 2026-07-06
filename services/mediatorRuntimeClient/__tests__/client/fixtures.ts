import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';

export function createMinimalRuntimeSuccess(
  overrides: Partial<MediatorRuntimeEdgeSuccess> = {}
): MediatorRuntimeEdgeSuccess {
  const mediationState = createBaselineMediationState({
    meta: {
      ...createBaselineMediationState().meta,
      language: 'en',
    },
  });

  return {
    ok: true,
    engineVersion: 'v2.3',
    finalMediatorMessage: {
      text: 'What would help you feel heard in this moment?',
      source: 'stub',
      safetyLevel: 'none',
      language: 'en',
      turnNumber: 3,
      accepted: true,
      validationAction: 'accept',
    },
    mediationState,
    sessionMemory: createEmptySessionMemory(),
    intervention: {
      id: 'int-1',
      type: 'open_deepen',
      target: 'both',
      visibility: 'public',
      content: {
        primaryMessage: 'What would help you feel heard in this moment?',
      },
      goal: 'UNDERSTAND',
      intent: 'explore_perspective',
      strategy: 'curious_inquiry',
      rationale: 'test',
      expectedEffect: {
        id: 'eff-1',
        description: 'test',
        observableSignals: [],
        targetParticipant: 'both',
        verificationMethod: 'self_report',
        successCriteria: {
          type: 'engagement',
          threshold: 1,
          confidenceRequired: 50,
        },
        timeHorizon: 1,
      },
      libraryPatternId: null,
      signature: 'sig-1',
      generatedAt: '2026-07-06T00:00:00.000Z',
    },
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
    runtimeMetadata: {
      engineVersion: 'v2.3',
      turnNumber: 3,
      startedAt: '2026-07-06T00:00:00.000Z',
      completedAt: '2026-07-06T00:00:01.000Z',
      durationMs: 1000,
      providerId: 'deterministic-stub',
      retryCount: 0,
    },
    fallbackUsed: false,
    retryCount: 0,
    ...overrides,
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
