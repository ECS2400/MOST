import type {
  DecisionEngineInput,
  MediationState,
  PriorityOutput,
  ReflectionOutput,
  SafetyOutput,
  StrategyEngineOutput,
} from '@/types/mediator';
import {
  createEmptyDecisionOutput,
  createEmptyMediationState,
  createEmptyPriorityOutput,
  createEmptyReflectionOutput,
  createEmptySafetyOutput,
  createEmptyStrategyOutput,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createStubOrchestrateRequest } from '@/services/mediatorEngine/__tests__/priority/fixtures';

export function createBaselineMediationState(
  overrides: Partial<MediationState> = {}
): MediationState {
  return {
    ...createEmptyMediationState(createStubOrchestrateRequest()),
    ...overrides,
  };
}

export function createBaselineStrategyOutput(
  overrides: Partial<StrategyEngineOutput> = {}
): StrategyEngineOutput {
  return { ...createEmptyStrategyOutput(), ...overrides };
}

export function createBaselineReflectionOutput(
  overrides: Partial<ReflectionOutput> = {}
): ReflectionOutput {
  return { ...createEmptyReflectionOutput(), ...overrides };
}

export function createBaselinePriorityOutput(
  overrides: Partial<PriorityOutput> = {}
): PriorityOutput {
  return { ...createEmptyPriorityOutput(), ...overrides };
}

export function createBaselineSafetyOutput(
  overrides: Partial<SafetyOutput> = {}
): SafetyOutput {
  return { ...createEmptySafetyOutput(), ...overrides };
}

export function createDecisionInput(
  overrides: Partial<DecisionEngineInput> = {}
): DecisionEngineInput {
  return {
    state: createBaselineMediationState(),
    reflection: createBaselineReflectionOutput(),
    strategy: createBaselineStrategyOutput(),
    priority: createBaselinePriorityOutput(),
    safety: null,
    turnNumber: 3,
    ...overrides,
  };
}

export { createEmptyDecisionOutput };
