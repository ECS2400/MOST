import assert from 'node:assert/strict';
import type {
  MediationState,
  PriorityInput,
  PriorityOutput,
  ReflectionOutput,
  SafetyOutput,
  StrategyEngineOutput,
} from '@/types/mediator';
import {
  createEmptyMediationState,
  createEmptyReflectionOutput,
  createEmptyStrategyOutput,
  skeletonConfidence,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

const TIMESTAMP = '2026-07-05T00:00:00.000Z';

/** Minimal orchestrate_turn request for building stub mediation state. */
export function createStubOrchestrateRequest() {
  return {
    mediationId: 'test-mediation',
    sessionId: 'test-session',
    trigger: 'partner_message' as const,
    turnNumber: 3,
    mediationState: null,
    transcriptDelta: [],
    engineVersion: 'v2.3' as const,
  };
}

/** Baseline mediation state for priority tests. */
export function createBaselineMediationState(
  overrides: Partial<MediationState> = {}
): MediationState {
  return {
    ...createEmptyMediationState(createStubOrchestrateRequest()),
    ...overrides,
  };
}

/** Baseline strategy output for priority tests. */
export function createBaselineStrategyOutput(
  overrides: Partial<StrategyEngineOutput> = {}
): StrategyEngineOutput {
  return { ...createEmptyStrategyOutput(), ...overrides };
}

/** Baseline reflection output for priority tests. */
export function createBaselineReflectionOutput(
  overrides: Partial<ReflectionOutput> = {}
): ReflectionOutput {
  return { ...createEmptyReflectionOutput(), ...overrides };
}

/** Builds a PriorityInput with sensible defaults. */
export function createPriorityInput(overrides: Partial<PriorityInput> = {}): PriorityInput {
  return {
    state: createBaselineMediationState(),
    reflection: createBaselineReflectionOutput(),
    safety: null,
    strategy: createBaselineStrategyOutput(),
    turnNumber: 3,
    ...overrides,
  };
}

/** Safety output that preempts the standard pipeline. */
export function createPreemptiveSafetyOutput(
  overrides: Partial<SafetyOutput> = {}
): SafetyOutput {
  return {
    level: 'L2_pause',
    preempted: true,
    signals: [
      {
        category: 'severe_distress',
        confidence: 90,
        quote: 'I cannot do this anymore',
        detectedAt: TIMESTAMP,
        turnNumber: 3,
        detectionLayer: 'heuristic',
      },
    ],
    recommendedInterventionType: 'safety_response',
    blockGoalTransitions: true,
    blockStandardInterventions: true,
    allowedInterventionTypes: ['safety_response', 'pause_session', 'deescalate'],
    assessed: skeletonConfidence(true),
    ...overrides,
  };
}

/** Readiness reflection with both partners ready to advance. */
export function createReadyReflectionOutput(): ReflectionOutput {
  const ready = {
    readyToAdvance: skeletonConfidence(true),
    needsMoreTime: skeletonConfidence(false),
    needsDifferentApproach: skeletonConfidence(false),
    signals: [] as string[],
  };
  ready.readyToAdvance.confidence = 85;
  return createBaselineReflectionOutput({
    partnerReadiness: { host: ready, partner: ready },
    conversationMovedForward: skeletonConfidence(true),
  });
}

/** Asserts allowed and forbidden intervention lists have no overlap. */
export function assertDisjointInterventionConstraints(output: PriorityOutput): void {
  const allowed = new Set(output.allowedInterventionTypes);
  const overlap = output.forbiddenInterventionTypes.filter((type) => allowed.has(type));
  assert.ok(
    overlap.length === 0,
    `allowed ∩ forbidden must be empty; overlap: ${overlap.join(', ')}`
  );
}
