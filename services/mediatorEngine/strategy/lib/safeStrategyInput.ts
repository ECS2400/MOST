import type {
  ConversationPace,
  DynamicsSignalBundle,
  EmotionalLoadState,
  GoalContinuityContext,
  RecoveryState,
  ReflectionOutput,
  SafetyLevel,
  SafetyOutput,
  SessionMemory,
  StrategyEngineInput,
  StrategyShift,
  TherapeuticGoal,
  TherapeuticStrategy,
  TurnNumber,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';

/** Normalized, privacy-safe strategy selection context. */
export interface SafeStrategyContext {
  turnNumber: TurnNumber;
  currentGoal: TherapeuticGoal;
  pace: ConversationPace;
  load: EmotionalLoadState;
  dynamics: DynamicsSignalBundle;
  recovery: RecoveryState | null;
  sessionMemory: SessionMemory;
  reflection: ReflectionOutput;
  safety: SafetyOutput | null;
  safetyActive: boolean;
  recoveryActive: boolean;
  escalationActive: boolean;
  blameLoopActive: boolean;
  exhaustionActive: boolean;
  breakthroughActive: boolean;
  reflectionShift: StrategyShift;
  /** Reflection recommends slowing/pausing without safety preempt. */
  pauseRecommended: boolean;
  bothReady: boolean;
  previousPrimaryStrategy: TherapeuticStrategy | null;
  goalContinuityContext: GoalContinuityContext | null;
}

function readBool(
  field: { value?: boolean } | null | undefined,
  fallback = false
): boolean {
  if (!field || typeof field !== 'object') return fallback;
  return typeof field.value === 'boolean' ? field.value : fallback;
}

function normalizeGoal(value: unknown): TherapeuticGoal {
  const goals: TherapeuticGoal[] = [
    'SAFE_OPENING',
    'EMOTION_NAMING',
    'EMOTION_UNDERSTANDING',
    'EMOTION_ACKNOWLEDGMENT',
    'NEED_NAMING',
    'PERSPECTIVE_SHARING',
    'REFRAME',
    'AGREEMENT',
    'FUTURE_PLAN',
    'CLOSURE',
  ];
  if (typeof value === 'string' && goals.includes(value as TherapeuticGoal)) {
    return value as TherapeuticGoal;
  }
  return 'SAFE_OPENING';
}

function normalizeSafetyLevel(safety: SafetyOutput | null): SafetyLevel {
  const level = safety?.level;
  if (level === 'L1_gentle' || level === 'L2_pause' || level === 'L3_stop') return level;
  return 'none';
}

function isSafetyActive(safety: SafetyOutput | null): boolean {
  const level = normalizeSafetyLevel(safety);
  if (level !== 'none') return true;
  if (safety?.preempted === true) return true;
  return false;
}

function getPreviousPrimaryStrategy(memory: SessionMemory): TherapeuticStrategy | null {
  const history = Array.isArray(memory.interventionHistory) ? memory.interventionHistory : [];
  const last = history.at(-1);
  return typeof last?.strategy === 'string' ? last.strategy : null;
}

function defaultLoad(): EmotionalLoadState {
  return {
    host: { value: 0, confidence: 0, source: 'heuristic', evidence: [], assessedAt: '', stale: false },
    partner: { value: 0, confidence: 0, source: 'heuristic', evidence: [], assessedAt: '', stale: false },
    overall: 0,
    trend: 'stable',
    exhaustionDetected: { value: false, confidence: 0, source: 'heuristic', evidence: [], assessedAt: '', stale: false },
    disengagementRisk: { value: false, confidence: 0, source: 'heuristic', evidence: [], assessedAt: '', stale: false },
  };
}

function defaultDynamics(): DynamicsSignalBundle {
  const base = { value: false, confidence: 0, source: 'heuristic' as const, evidence: [], assessedAt: '', stale: false };
  return {
    temperature: { ...base, value: 0 },
    escalation: base,
    blameLoop: base,
    breakthrough: { ...base, value: null },
    evasion: base,
    mutualUnderstanding: { ...base, value: 0 },
  };
}

/** Normalizes strategy input without reading transcript or message content. */
export function safeStrategyInput(input: unknown): SafeStrategyContext {
  const raw = (input && typeof input === 'object' ? input : {}) as StrategyEngineInput;
  const state = raw.state && typeof raw.state === 'object' ? raw.state : {};
  const reflection = raw.reflection && typeof raw.reflection === 'object' ? raw.reflection : {};
  const safety = raw.safety && typeof raw.safety === 'object' ? raw.safety : null;

  const load = state.load && typeof state.load === 'object' ? state.load : defaultLoad();
  const dynamics =
    state.dynamics && typeof state.dynamics === 'object' ? state.dynamics : defaultDynamics();
  const recovery =
    state.recovery && typeof state.recovery === 'object' ? state.recovery : null;
  const sessionMemory =
    state.sessionMemory && typeof state.sessionMemory === 'object'
      ? state.sessionMemory
      : createEmptySessionMemory();

  const reflectionShift =
    typeof reflection.recommendedStrategyShift === 'string'
      ? reflection.recommendedStrategyShift
      : 'continue';

  const pauseRecommended = reflectionShift === 'pause';
  const escalationActive = readBool(dynamics.escalation);
  const blameLoopActive = readBool(dynamics.blameLoop);
  const exhaustionActive = readBool(load.exhaustionDetected);
  const breakthroughActive =
    dynamics.breakthrough?.value != null ||
    reflectionShift === 'consolidate';
  const recoveryActive =
    recovery?.active === true || reflectionShift === 'recover';
  const safetyActive = isSafetyActive(safety);

  const hostReady = readBool(reflection.partnerReadiness?.host?.readyToAdvance);
  const partnerReady = readBool(reflection.partnerReadiness?.partner?.readyToAdvance);

  return {
    turnNumber: typeof raw.turnNumber === 'number' && raw.turnNumber > 0 ? raw.turnNumber : 1,
    currentGoal: normalizeGoal(state.currentGoal),
    pace: state.pace === 'slow' || state.pace === 'fast' ? state.pace : 'normal',
    load,
    dynamics,
    recovery,
    sessionMemory,
    reflection: reflection as ReflectionOutput,
    safety,
    safetyActive,
    recoveryActive,
    escalationActive,
    blameLoopActive,
    exhaustionActive,
    breakthroughActive,
    reflectionShift,
    pauseRecommended,
    bothReady: hostReady && partnerReady,
    previousPrimaryStrategy: getPreviousPrimaryStrategy(sessionMemory),
    goalContinuityContext:
      raw.goalContinuityContext && typeof raw.goalContinuityContext === 'object'
        ? raw.goalContinuityContext
        : null,
  };
}

/** Returns whether goal advance is blocked by active priority conditions. */
export function isGoalAdvanceBlocked(ctx: SafeStrategyContext): boolean {
  return (
    ctx.safetyActive ||
    ctx.recoveryActive ||
    ctx.escalationActive ||
    ctx.blameLoopActive ||
    ctx.exhaustionActive ||
    ctx.pauseRecommended ||
    ctx.reflectionShift === 'slow_down' ||
    ctx.reflectionShift === 'deescalate'
  );
}

export type { StrategyPriorityKey };
