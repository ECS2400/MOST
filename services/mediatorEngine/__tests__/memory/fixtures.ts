import type {
  ComplianceResult,
  Intervention,
  MediationState,
  ReflectionOutput,
  SessionMemory,
  SessionMemoryUpdateInput,
  StrategyEngineOutput,
} from '@/types/mediator';
import {
  createEmptyComplianceResult,
  createEmptyIntervention,
  createEmptyMediationState,
  createEmptyReflectionOutput,
  createEmptySessionMemory,
  createEmptyStrategyOutput,
  skeletonConfidence,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

const TIMESTAMP = '2026-07-05T00:00:00.000Z';

export function createStubOrchestrateRequest(turnNumber = 3) {
  return {
    mediationId: 'test-mediation',
    sessionId: 'test-session',
    trigger: 'partner_message' as const,
    turnNumber,
    mediationState: null,
    transcriptDelta: [],
    engineVersion: 'v2.3' as const,
  };
}

export function createBaselineMediationState(
  overrides: Partial<MediationState> = {}
): MediationState {
  return {
    ...createEmptyMediationState(createStubOrchestrateRequest()),
    ...overrides,
  };
}

export function createBaselineIntervention(
  turnNumber: number,
  overrides: Partial<Intervention> = {}
): Intervention {
  return {
    ...createEmptyIntervention(turnNumber),
    id: 'intervention-001',
    type: 'validate',
    signature: 'validate:SAFE_OPENING:both',
    goal: 'SAFE_OPENING',
    intent: 'increase_emotional_safety',
    strategy: 'validate_emotions',
    expectedEffect: {
      id: 'effect-001',
      description: 'Partner feels validated',
      observableSignals: ['acknowledgment'],
      targetParticipant: 'both',
      verificationMethod: 'next_message',
      successCriteria: { type: 'check_confirmed', threshold: 0, confidenceRequired: 70 },
      timeHorizon: 1,
    },
    content: {
      primaryMessage: 'I hear that this is difficult for you.',
      secondaryMessage: 'Would you like to share more?',
    },
    ...overrides,
  };
}

export function createBaselineReflectionOutput(
  overrides: Partial<ReflectionOutput> = {}
): ReflectionOutput {
  const helpful = skeletonConfidence(true);
  helpful.confidence = 80;
  const moved = skeletonConfidence(true);
  moved.confidence = 75;

  return {
    ...createEmptyReflectionOutput(),
    lastInterventionHelpful: helpful,
    conversationMovedForward: moved,
    shouldChangeStrategy: false,
    recommendedStrategyShift: 'continue',
    expectedEffectEvaluation: {
      effectId: 'effect-001',
      achieved: true,
      confidence: 78,
      evidence: ['turn-signal-3'],
      partial: false,
    },
    ...overrides,
  };
}

export function createBaselineComplianceResult(
  overrides: Partial<ComplianceResult> = {}
): ComplianceResult {
  return {
    ...createEmptyComplianceResult(),
    ...overrides,
  };
}

export function createBaselineSessionMemory(
  overrides: Partial<SessionMemory> = {}
): SessionMemory {
  return {
    ...createEmptySessionMemory(),
    ...overrides,
  };
}

export function createSessionMemoryUpdateInput(
  overrides: Partial<SessionMemoryUpdateInput> = {}
): SessionMemoryUpdateInput {
  const turnNumber = overrides.turnNumber ?? 3;
  return {
    previousMemory: createBaselineSessionMemory(),
    state: createBaselineMediationState(),
    intervention: createBaselineIntervention(turnNumber),
    reflection: createBaselineReflectionOutput(),
    complianceResult: createBaselineComplianceResult(),
    turnNumber,
    ...overrides,
  };
}

export function createBaselineStrategyOutput(
  overrides: Partial<StrategyEngineOutput> = {}
): StrategyEngineOutput {
  return { ...createEmptyStrategyOutput(), ...overrides };
}

export { TIMESTAMP };
