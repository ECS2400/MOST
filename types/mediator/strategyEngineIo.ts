/**
 * Therapeutic Strategy Engine I/O contracts for Mediator AI Engine v2.3.
 *
 * Role: top-layer pipeline types that compose mid-layer module outputs.
 * Imports MediationState-free context slices to avoid cycles with strategies.ts.
 */

import type { ConfidenceScore, InterventionTarget } from './common';
import type {
  ConversationPace,
  DynamicsSignalBundle,
  EmotionalLoadState,
} from './dynamics';
import type {
  SuggestedGoalTransition,
  TherapeuticIntent,
  TherapeuticStrategy,
} from './engineTypes';
import type { OutcomeCheck, SessionObjectives } from './goals';
import type { SessionPersonality } from './personality';
import type { PriorityOutput } from './priority';
import type { ReflectionOutput } from './reflection';
import type { RecoveryState } from './strategies';
import type { SafetyOutput } from './safety';
import type { SessionMemory } from './sessionMemory';
import type { TherapeuticGoal } from './therapeuticGoal';

/**
 * Lightweight state slice passed to Therapeutic Strategy Engine.
 *
 * Role: replaces full {@link MediationState} import in TSE — contains only
 * fields required for strategy selection.
 */
export interface StrategyEngineStateContext {
  currentGoal: TherapeuticGoal;
  goalChecks: OutcomeCheck[];
  dynamics: DynamicsSignalBundle;
  pace: ConversationPace;
  load: EmotionalLoadState;
  recovery: RecoveryState | null;
  sessionPersonality: SessionPersonality;
  sessionMemory: SessionMemory;
  sessionObjectives: SessionObjectives | null;
}

/** Input contract for Therapeutic Strategy Engine. */
export interface StrategyEngineInput {
  state: StrategyEngineStateContext;
  reflection: ReflectionOutput;
  priority: PriorityOutput;
  safety: SafetyOutput | null;
}

/** Output contract for Therapeutic Strategy Engine. */
export interface StrategyEngineOutput {
  primaryStrategy: TherapeuticStrategy;
  secondaryStrategy: TherapeuticStrategy | null;
  confidence: ConfidenceScore;
  rationale: string;
  blockedStrategies: TherapeuticStrategy[];
  suggestedGoalTransition: SuggestedGoalTransition;
  /** Recommended strategy duration in turns (1–3). */
  strategyDurationHint: number;
  alignmentWithGoal: TherapeuticGoal;
}

/** Compact summary for Explainability Layer module inputs. */
export interface StrategyEngineOutputSummary {
  primaryStrategy: TherapeuticStrategy;
  secondaryStrategy: TherapeuticStrategy | null;
  suggestedGoalTransition: SuggestedGoalTransition;
  confidence: ConfidenceScore;
}

/** Binding of intent to intervention context — input to Intervention Engine. */
export interface InterventionIntent {
  intent: TherapeuticIntent;
  goal: TherapeuticGoal;
  strategy: TherapeuticStrategy;
  targetParticipant: InterventionTarget;
  addressesCheckId: string | null;
  confidence: ConfidenceScore;
}
