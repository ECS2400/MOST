import type {
  ComplianceResult,
  DecisionEngineOutput,
  Intervention,
  MediationState,
  MediatorLang,
  PriorityOutput,
  PromptComposerInput,
  ReflectionOutput,
  SafetyLevel,
  SafetyOutput,
  SessionMemory,
  StrategyEngineOutput,
  TranscriptMessage,
  TurnNumber,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';

/** Normalized prompt composer context. */
export interface SafePromptContext {
  turnNumber: TurnNumber;
  language: MediatorLang;
  currentGoal: string;
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  safetyOutput: SafetyOutput | null;
  reflectionOutput: ReflectionOutput;
  strategyOutput: StrategyEngineOutput;
  priorityOutput: PriorityOutput;
  decisionOutput: DecisionEngineOutput;
  intervention: Intervention;
  complianceResult: ComplianceResult;
  transcriptWindow: TranscriptMessage[];
}

const SUPPORTED_LANGUAGES: MediatorLang[] = ['pl', 'en', 'it', 'de', 'fr', 'es'];
const VALID_SAFETY_LEVELS: SafetyLevel[] = ['none', 'L1_gentle', 'L2_pause', 'L3_stop'];

function normalizeLanguage(value: unknown): MediatorLang {
  if (typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as MediatorLang)) {
    return value as MediatorLang;
  }
  return 'en';
}

function normalizeSafetyLevel(value: unknown): SafetyLevel {
  if (typeof value === 'string' && VALID_SAFETY_LEVELS.includes(value as SafetyLevel)) {
    return value as SafetyLevel;
  }
  return 'none';
}

/** Reads language from raw compose input without throwing. */
export function safeFallbackLanguage(input: unknown): MediatorLang {
  if (!input || typeof input !== 'object') return 'en';
  const raw = input as PromptComposerInput;
  const state =
    raw.mediationState && typeof raw.mediationState === 'object' ? raw.mediationState : null;
  return normalizeLanguage(raw.language ?? state?.meta?.language);
}

/** Reads safety level from raw compose input without throwing. */
export function safeFallbackSafetyLevel(input: unknown): SafetyLevel {
  if (!input || typeof input !== 'object') return 'none';
  const raw = input as PromptComposerInput;
  const safety =
    raw.safetyOutput && typeof raw.safetyOutput === 'object' ? raw.safetyOutput : null;
  return normalizeSafetyLevel(safety?.level);
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Normalizes prompt composer input — never throws. */
export function safePromptInput(input: unknown): SafePromptContext {
  const raw = (input && typeof input === 'object' ? input : {}) as PromptComposerInput;

  const state =
    raw.mediationState && typeof raw.mediationState === 'object'
      ? raw.mediationState
      : ({} as MediationState);

  return {
    turnNumber: typeof raw.turnNumber === 'number' && raw.turnNumber > 0 ? raw.turnNumber : 1,
    language: normalizeLanguage(raw.language ?? state.meta?.language),
    currentGoal: typeof state.currentGoal === 'string' ? state.currentGoal : 'SAFE_OPENING',
    mediationState: state,
    sessionMemory:
      raw.sessionMemory && typeof raw.sessionMemory === 'object'
        ? raw.sessionMemory
        : createEmptySessionMemory(),
    safetyOutput: raw.safetyOutput && typeof raw.safetyOutput === 'object' ? raw.safetyOutput : null,
    reflectionOutput:
      raw.reflectionOutput && typeof raw.reflectionOutput === 'object'
        ? raw.reflectionOutput
        : ({} as ReflectionOutput),
    strategyOutput:
      raw.strategyOutput && typeof raw.strategyOutput === 'object'
        ? raw.strategyOutput
        : ({} as StrategyEngineOutput),
    priorityOutput:
      raw.priorityOutput && typeof raw.priorityOutput === 'object'
        ? raw.priorityOutput
        : ({} as PriorityOutput),
    decisionOutput:
      raw.decisionOutput && typeof raw.decisionOutput === 'object'
        ? raw.decisionOutput
        : ({} as DecisionEngineOutput),
    intervention:
      raw.intervention && typeof raw.intervention === 'object'
        ? raw.intervention
        : ({} as Intervention),
    complianceResult:
      raw.complianceResult && typeof raw.complianceResult === 'object'
        ? raw.complianceResult
        : { compliant: true, violations: [], attemptNumber: 1, fallbackUsed: false, validatedAt: '', validatorLayer: 'deterministic' as const },
    transcriptWindow: safeArray<TranscriptMessage>(raw.transcriptWindow),
  };
}
