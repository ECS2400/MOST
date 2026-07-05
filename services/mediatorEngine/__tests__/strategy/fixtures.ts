import type {
  BreakthroughType,
  DynamicsSignalBundle,
  EmotionalLoadState,
  RecoveryState,
  ReflectionOutput,
  SafetyOutput,
  StrategyEngineInput,
  StrategyEngineStateContext,
  TherapeuticGoal,
} from '@/types/mediator';
import {
  createEmptyReflectionOutput,
  createEmptySessionMemory,
  skeletonConfidence,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

export const PRIVATE_TEXT = '__PRIVATE_TRANSCRIPT_CONTENT__';

function defaultDynamics(overrides: Partial<DynamicsSignalBundle> = {}): DynamicsSignalBundle {
  const base = skeletonConfidence(false);
  return {
    temperature: { ...skeletonConfidence(0), value: 0 },
    escalation: base,
    blameLoop: base,
    breakthrough: { ...base, value: null },
    evasion: base,
    mutualUnderstanding: { ...skeletonConfidence(0), value: 0 },
    ...overrides,
  };
}

function defaultLoad(overrides: Partial<EmotionalLoadState> = {}): EmotionalLoadState {
  return {
    host: skeletonConfidence(30),
    partner: skeletonConfidence(30),
    overall: 30,
    trend: 'stable',
    exhaustionDetected: skeletonConfidence(false),
    disengagementRisk: skeletonConfidence(false),
    ...overrides,
  };
}

export function createStrategyStateContext(
  overrides: Partial<StrategyEngineStateContext> = {}
): StrategyEngineStateContext {
  return {
    currentGoal: 'SAFE_OPENING',
    goalChecks: [],
    dynamics: defaultDynamics(),
    pace: 'normal',
    load: defaultLoad(),
    recovery: null,
    sessionPersonality: {
      core: {
        calm: 50,
        warm: 50,
        structured: 50,
        neutral: 50,
        empathetic: 50,
        confident: 50,
      },
      profile: 'steady_mediator',
      adaptiveModifiers: { warmthBoost: 0, structureBoost: 0, lastAdjustedTurn: 0 },
      immutableRuleRefs: [],
    },
    sessionMemory: createEmptySessionMemory(),
    sessionObjectives: null,
    ...overrides,
  };
}

export function createStrategyInput(
  overrides: Partial<StrategyEngineInput> = {}
): StrategyEngineInput {
  return {
    state: createStrategyStateContext(),
    reflection: createEmptyReflectionOutput(),
    safety: null,
    turnNumber: 3,
    ...overrides,
  };
}

export function withGoal(goal: TherapeuticGoal): Partial<StrategyEngineInput> {
  return {
    state: createStrategyStateContext({ currentGoal: goal }),
  };
}

export function withEscalation(): Partial<StrategyEngineInput> {
  const escalation = skeletonConfidence(true);
  escalation.confidence = 85;
  return {
    state: createStrategyStateContext({
      dynamics: defaultDynamics({ escalation }),
    }),
  };
}

export function withBlameLoop(): Partial<StrategyEngineInput> {
  const blameLoop = skeletonConfidence(true);
  blameLoop.confidence = 80;
  return {
    state: createStrategyStateContext({
      dynamics: defaultDynamics({ blameLoop }),
    }),
  };
}

export function withExhaustion(): Partial<StrategyEngineInput> {
  const exhaustionDetected = skeletonConfidence(true);
  exhaustionDetected.confidence = 82;
  return {
    state: createStrategyStateContext({
      load: defaultLoad({ exhaustionDetected }),
    }),
  };
}

export function withBreakthrough(type: BreakthroughType = 'mutual_understanding'): Partial<StrategyEngineInput> {
  const breakthrough = skeletonConfidence(type);
  breakthrough.confidence = 88;
  return {
    state: createStrategyStateContext({
      dynamics: defaultDynamics({ breakthrough }),
    }),
  };
}

export function withRecovery(overrides: Partial<RecoveryState> = {}): Partial<StrategyEngineInput> {
  return {
    state: createStrategyStateContext({
      recovery: {
        active: true,
        trigger: 'explicit_correction',
        triggerQuote: PRIVATE_TEXT,
        confidence: 85,
        startedAtTurn: 2,
        recoveryAttempt: 1,
        affectedCheckIds: [],
        affectedFields: [],
        ...overrides,
      },
    }),
  };
}

export function withSafety(overrides: Partial<SafetyOutput> = {}): Partial<StrategyEngineInput> {
  return {
    safety: {
      level: 'L2_pause',
      preempted: true,
      signals: [
        {
          category: 'severe_distress',
          confidence: 90,
          matchedPatternId: 'test-severe-distress',
          messageId: 'test-msg-1',
          evidenceRef: 'test-severe-distress:test-msg-1',
          detectedAt: '2026-07-05T00:00:00.000Z',
          turnNumber: 3,
          detectionLayer: 'heuristic',
        },
      ],
      recommendedInterventionType: 'safety_response',
      blockGoalTransitions: true,
      blockStandardInterventions: true,
      allowedInterventionTypes: ['safety_response', 'pause_session'],
      assessed: skeletonConfidence(true),
      ...overrides,
    },
  };
}

export function withReflectionShift(
  shift: ReflectionOutput['recommendedStrategyShift']
): Partial<StrategyEngineInput> {
  return {
    reflection: {
      ...createEmptyReflectionOutput(),
      recommendedStrategyShift: shift,
    },
  };
}

export function withBothReady(): Partial<StrategyEngineInput> {
  const ready = {
    readyToAdvance: skeletonConfidence(true),
    needsMoreTime: skeletonConfidence(false),
    needsDifferentApproach: skeletonConfidence(false),
    signals: [] as string[],
  };
  ready.readyToAdvance.confidence = 85;
  return {
    reflection: {
      ...createEmptyReflectionOutput(),
      partnerReadiness: { host: ready, partner: { ...ready } },
    },
  };
}
