/**
 * Pipeline orchestration contracts for Mediator AI Engine v2.3.
 *
 * Role: request/response shapes for the orchestrate_turn edge function entry
 * point and individual engine module I/O boundaries.
 */

import type {
  MediationId,
  SessionId,
  TurnNumber,
} from './common';
import type { EvidenceStore } from './evidence';
import type { Explainability } from './explainability';
import type { Intervention } from './interventions';
import type { MediationState } from './mediationState';
import type { PriorityOutput } from './priority';
import type { ReflectionOutput } from './reflection';
import type { SafetyOutput } from './safety';
import type { SessionMemory } from './sessionMemory';
import type { StrategyEngineOutput } from './strategies';
import type { ComplianceResult } from './constitution';
import type { TranscriptMessage } from './reflection';

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
  /** Current persisted state — null on first turn of a new v2.3 session. */
  mediationState: MediationState | null;
  /** New messages since last orchestration. */
  transcriptDelta: TranscriptMessage[];
  engineVersion: MediatorEngineVersion;
}

/**
 * Response payload from orchestrate_turn edge function.
 *
 * Role: returned to liveMediationV2 client wrapper; includes intervention
 * plus audit artifacts for debugging.
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

/** Output of State Analyzer pipeline step. */
export interface StateAnalyzerOutput {
  updatedState: MediationState;
  evidenceStore: EvidenceStore;
  dynamicsUpdated: boolean;
  participantFieldsUpdated: boolean;
  decayEventsApplied: number;
}

/** Output of Decision Engine pipeline step. */
export interface DecisionEngineOutput {
  selectedInterventionType: import('./interventions').InterventionType;
  goalTransition: import('./explainability').ExplainabilityGoalTransition;
  intent: import('./strategies').TherapeuticIntent;
  strategy: import('./strategies').TherapeuticStrategy;
  rationale: string;
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
