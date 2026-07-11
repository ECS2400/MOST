/**
 * Pipeline orchestration contracts for Mediator AI Engine v2.3.
 *
 * Role: request/response shapes for orchestrate_turn edge function.
 */

import type { MediationId, MediatorLang, SessionId, TurnNumber } from './common';
import type { ComplianceResult } from './constitution';
import type { EvidenceStore } from './evidence';
import type {
  ExplainabilityGoalTransition,
  InterventionType,
  TherapeuticIntent,
  TherapeuticStrategy,
} from './engineTypes';
import type { Explainability } from './explainability';
import type { Intervention } from './interventions';
import type { MediationState } from './mediationState';
import type { PriorityOutput } from './priority';
import type { ReflectionOutput, TranscriptMessage } from './reflection';
import type { SafetyOutput } from './safety';
import type { GoalContinuityContext } from './goalContinuity';
import type { ContinuityContext } from './continuity';
import type { SessionMemory } from './sessionMemory';
import type { RuntimeClientEvent } from './runtimeSession';
import type { InterventionIntent, StrategyEngineOutput } from './strategyEngineIo';

/** Feature flag values controlling engine version rollout. */
export type MediatorEngineVersion = 'v1' | 'v2.3';

/** Trigger reason for orchestrate_turn invocation. */
export type OrchestrateTurnTrigger =
  | 'partner_message'
  | 'host_generate'
  | 'session_start'
  | 'resume_after_pause';

/**
 * Request payload for orchestrate_turn edge function.
 *
 * Role: replaces legacy MediatorMode-based requests in v2.3 pipeline.
 */
export interface OrchestrateTurnRequest {
  mediationId: MediationId;
  sessionId: SessionId;
  trigger: OrchestrateTurnTrigger;
  turnNumber: TurnNumber;
  mediationState: MediationState | null;
  transcriptDelta: TranscriptMessage[];
  engineVersion: MediatorEngineVersion;
  /** Session language from edge/runtime input — propagated into MediationState.meta.language. */
  language?: MediatorLang;
  /** Client-originated flow events (transport only until UI-B.3d.2+). */
  clientEvents?: RuntimeClientEvent[];
}

/**
 * Response payload from orchestrate_turn edge function.
 *
 * Role: returned to liveMediationV2 client wrapper.
 */
export interface OrchestrateTurnResponse {
  mediationState: MediationState;
  intervention: Intervention;
  sessionMemory: SessionMemory;
  evidenceStore: EvidenceStore;
  explainability: Explainability;
  complianceResult: ComplianceResult;
  engineVersion: MediatorEngineVersion;
}

/** Input to State Analyzer pipeline step. */
export interface StateAnalyzerInput {
  mediationState: MediationState | null;
  transcriptDelta: TranscriptMessage[];
  turnNumber: TurnNumber;
}

/** Output of State Analyzer pipeline step. */
export interface StateAnalyzerOutput {
  updatedState: MediationState;
  evidenceStore: EvidenceStore;
  dynamicsUpdated: boolean;
  participantFieldsUpdated: boolean;
  decayEventsApplied: number;
}

/** Input to Decision Engine pipeline step. */
export interface DecisionEngineInput {
  state: MediationState;
  reflection: ReflectionOutput;
  strategy: StrategyEngineOutput;
  priority: PriorityOutput;
  safety: SafetyOutput | null;
  turnNumber: TurnNumber;
  /** Pre-turn session memory for continuity-aware intervention selection. */
  sessionMemory?: SessionMemory;
  /** Structural continuity hints — no transcript or PII. */
  continuityContext?: ContinuityContext;
  /** Structural goal-stage hints — no transcript or PII. */
  goalContinuityContext?: GoalContinuityContext;
}

/** Output of Decision Engine pipeline step. */
export interface DecisionEngineOutput {
  selectedInterventionType: InterventionType;
  goalTransition: ExplainabilityGoalTransition;
  intent: TherapeuticIntent;
  strategy: TherapeuticStrategy;
  rationale: string;
}

/** Input to Intervention Engine pipeline step. */
export interface InterventionEngineInput {
  state: MediationState;
  intent: InterventionIntent;
  decision: DecisionEngineOutput;
  turnNumber: TurnNumber;
}

/** Aggregated module outputs passed to Explainability builder. */
export interface PipelineTurnContext {
  turnNumber: TurnNumber;
  request: OrchestrateTurnRequest;
  stateAnalyzerOutput: StateAnalyzerOutput;
  safetyOutput: SafetyOutput | null;
  reflectionOutput: ReflectionOutput;
  strategyOutput: StrategyEngineOutput;
  priorityOutput: PriorityOutput;
  decisionOutput: DecisionEngineOutput;
  intervention: Intervention;
  complianceResult: ComplianceResult;
}
