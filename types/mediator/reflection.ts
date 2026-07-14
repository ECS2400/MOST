/**
 * Reflection Engine types for Mediator AI Engine v2.3.
 *
 * Role: meta-cognitive layer — evaluates mediator effectiveness each turn.
 */

import type { ConfidenceScore, InterventionTarget, IsoTimestamp, TurnNumber } from './common';
import type { ConfidenceValue } from './confidence';
import type { ConversationPace } from './dynamics';
import type { SafetyLevel, StrategyShift, TherapeuticStrategy, InterventionType } from './engineTypes';
import type { OutcomeCheck } from './goals';
import type { ExpectedEffectEvaluation, MediatorIntervention } from './interventions';
import type { MediationStateSnapshot } from './mediationState';
import type { ComplianceResultSummary } from './sessionMemory';

export type { StrategyShift } from './engineTypes';

/** Transcript message slice used in Reflection diffing. */
export interface TranscriptMessage {
  id: string;
  authorRole: 'host' | 'partner' | 'mediator';
  content: string;
  turnNumber: TurnNumber;
  createdAt: IsoTimestamp;
  /** Live/engine message kind — drives repetition comparison eligibility. */
  messageType?: string;
}

/** Input to Reflection Engine for a single turn. */
export interface ReflectionInput {
  lastIntervention: MediatorIntervention;
  stateBefore: MediationStateSnapshot;
  stateAfter: MediationStateSnapshot;
  transcriptDelta: TranscriptMessage[];
  goalChecksDelta: OutcomeCheck[];
  /** Explicit turn index — falls back to stateAfter.meta.currentTurnNumber. */
  turnNumber?: TurnNumber;
  /** Prior turn reflection output, when available. */
  previousReflection?: ReflectionOutput | null;
  /** Compliance summary for the last intervention (prior turn). */
  lastComplianceResult?: ComplianceResultSummary | null;
  /** Safety level from Safety Layer, when available. */
  safetyLevel?: SafetyLevel | null;
  /** Intervention types flagged ineffective in session memory. */
  recentIneffectiveTypes?: InterventionType[];
}

/** Per-participant readiness assessment for goal advance. */
export interface ReadinessAssessment {
  readyToAdvance: ConfidenceValue<boolean>;
  needsMoreTime: ConfidenceValue<boolean>;
  needsDifferentApproach: ConfidenceValue<boolean>;
  signals: string[];
}

/** Strategy change recommendation from Reflection. */
export interface StrategyRecommendation {
  preferStrategyChange: boolean;
  suggestedStrategy: TherapeuticStrategy | null;
  reason: string;
  confidence: ConfidenceScore;
}

/** Pace change recommendation from Reflection. */
export interface PaceRecommendation {
  suggestedPace: ConversationPace | null;
  reason: string;
}

/** Load acknowledgment recommendation from Reflection. */
export interface LoadRecommendation {
  acknowledgeLoad: boolean;
  targetParticipant: InterventionTarget | null;
}

/**
 * Output of Reflection Engine for the current turn.
 *
 * Role: consumed by TSE and Decision Engine; summarized in SessionMemory.reflectionLog.
 */
export interface ReflectionOutput {
  understoodPartners: ConfidenceValue<boolean>;
  lastInterventionHelpful: ConfidenceValue<boolean>;
  conversationMovedForward: ConfidenceValue<boolean>;
  shouldChangeStrategy: boolean;
  repeatRisk: ConfidenceValue<boolean>;
  drillDownRisk: ConfidenceValue<boolean>;
  stuckRisk: ConfidenceValue<boolean>;
  recommendedStrategyShift: StrategyShift;
  reflectionNotes: string;
  expectedEffectEvaluation: ExpectedEffectEvaluation | null;
  partnerReadiness: {
    host: ReadinessAssessment;
    partner: ReadinessAssessment;
  };
  strategyRecommendation: StrategyRecommendation;
  paceRecommendation: PaceRecommendation;
  loadRecommendation: LoadRecommendation;
}

/** Compact input summary stored in reflection audit log. */
export interface ReflectionInputSummary {
  interventionType: string;
  goalAtTime: string;
  checksDeltaCount: number;
}

/** Single audit entry in SessionMemory.reflectionLog. */
export interface ReflectionEntry {
  turnNumber: TurnNumber;
  timestamp: IsoTimestamp;
  input: ReflectionInputSummary;
  output: ReflectionOutput;
  decisionTaken: string;
}

/** Compact summary for Explainability Layer. */
export interface ReflectionOutputSummary {
  lastInterventionHelpful: boolean;
  shouldChangeStrategy: boolean;
  recommendedStrategyShift: StrategyShift;
  expectedEffectAchieved: boolean | null;
}

/** Compact summary for Explainability Layer. */
export interface ReadinessAssessmentSummary {
  hostReadyToAdvance: boolean;
  partnerReadyToAdvance: boolean;
}
