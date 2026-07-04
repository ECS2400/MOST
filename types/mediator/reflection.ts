/**
 * Reflection Engine types for Mediator AI Engine v2.3.
 *
 * Role: meta-cognitive layer — evaluates mediator effectiveness each turn.
 * Never generates user-facing messages; outputs metadata for Decision and TSE.
 */

import type { ConfidenceScore, IsoTimestamp, TurnNumber } from './common';
import type { ConversationPace } from './dynamics';
import type { ConfidenceValue } from './evidence';
import type { OutcomeCheck } from './goals';
import type { ExpectedEffectEvaluation, MediatorIntervention } from './interventions';
import type { MediationStateSnapshot } from './mediationState';
import type { TherapeuticStrategy } from './strategies';
import type { InterventionTarget } from './common';

/** Recommended shift in therapeutic approach after self-evaluation. */
export type StrategyShift =
  | 'continue'
  | 'switch_to_choice'
  | 'switch_to_reflect'
  | 'advance_goal'
  | 'regress_goal'
  | 'pause';

/** Transcript message slice used in Reflection diffing. */
export interface TranscriptMessage {
  id: string;
  authorRole: 'host' | 'partner' | 'mediator';
  content: string;
  turnNumber: TurnNumber;
  createdAt: IsoTimestamp;
}

/** Input to Reflection Engine for a single turn. */
export interface ReflectionInput {
  lastIntervention: MediatorIntervention;
  stateBefore: MediationStateSnapshot;
  stateAfter: MediationStateSnapshot;
  transcriptDelta: TranscriptMessage[];
  goalChecksDelta: OutcomeCheck[];
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
 * Role: consumed by TSE and Decision Engine; logged in SessionMemory.reflectionLog.
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
