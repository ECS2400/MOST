/**
 * Session memory types for Mediator AI Engine v2.3.
 *
 * Role: condensed operational knowledge accumulated during one session.
 */

import type {
  ConfidenceScore,
  InterventionSignature,
  IsoTimestamp,
  ParticipantRole,
  TurnNumber,
} from './common';
import type { ConfidenceValue } from './confidence';
import type {
  BreakthroughType,
  EmotionLabel,
  InterventionType,
  NeedLabel,
  StrategyShift,
  TherapeuticIntent,
  TherapeuticStrategy,
} from './engineTypes';
import type { GoalTransition } from './goals';
import type { ExplainabilityGoalTransition } from './engineTypes';
import type { ComplianceResult } from './constitution';
import type { GoalContinuityContext } from './goalContinuity';
import type { ExpectedEffectEvaluation, Intervention } from './interventions';
import type { MediationState } from './mediationState';
import type { ReflectionOutput } from './reflection';
import type { TherapeuticGoal } from './therapeuticGoal';

/** Breakthrough record in session memory — structural metadata only, no utterance text. */
export interface SessionBreakthroughRecord {
  type: BreakthroughType;
  confidence: ConfidenceScore;
  turnNumber: TurnNumber;
  participant: ParticipantRole;
  /** Stable reference to the source event (turn/type/participant), not user content. */
  sourceEventId: string | null;
  /** Evidence item IDs linked to the breakthrough, when available. */
  evidenceRefIds: string[];
}

/** Compact compliance snapshot stored in intervention history. */
export interface ComplianceResultSummary {
  compliant: boolean;
  violationCount: number;
  blockingViolationCount: number;
  fallbackUsed: boolean;
  attemptNumber: number;
}

/** Intervention effectiveness record in session memory. */
export interface InterventionHistoryEntry {
  interventionId: string;
  turnNumber: TurnNumber;
  type: InterventionType;
  goal: TherapeuticGoal;
  intent: TherapeuticIntent;
  strategy: TherapeuticStrategy;
  expectedEffectId: string;
  signature: InterventionSignature;
  compliance: ComplianceResultSummary;
  effective: boolean | null;
  confidence: ConfidenceScore;
}

/** Compact reflection snapshot appended to session memory each turn. */
export interface SessionReflectionLogEntry {
  turnNumber: TurnNumber;
  lastInterventionHelpful: boolean | null;
  lastInterventionHelpfulConfidence: ConfidenceScore;
  conversationMovedForward: boolean | null;
  conversationMovedForwardConfidence: ConfidenceScore;
  shouldChangeStrategy: boolean;
  recommendedStrategyShift: StrategyShift;
  expectedEffectEvaluation: ExpectedEffectEvaluation | null;
}

/** Input to Session Memory update pipeline step. */
export interface SessionMemoryUpdateInput {
  previousMemory: SessionMemory;
  state: MediationState;
  intervention: Intervention;
  reflection: ReflectionOutput;
  complianceResult: ComplianceResult;
  turnNumber: TurnNumber;
  /** Structural goal continuity snapshot from the current turn. */
  goalContinuityContext?: GoalContinuityContext | null;
  /** Applied goal transition from Decision Engine. */
  goalTransition?: ExplainabilityGoalTransition;
}

/**
 * Operational memory persisted across turns within a single session.
 *
 * Role: updated by SESSION MEMORY UPDATE pipeline step after each turn.
 */
export interface SessionMemory {
  breakthroughs: SessionBreakthroughRecord[];
  confirmedEmotions: Array<ConfidenceValue<EmotionLabel> & { participant: ParticipantRole }>;
  confirmedNeeds: Array<ConfidenceValue<NeedLabel> & { participant: ParticipantRole }>;
  recurringNeeds: NeedLabel[];
  interventionHistory: InterventionHistoryEntry[];
  effectivePatterns: InterventionType[];
  ineffectivePatterns: InterventionType[];
  completedGoals: TherapeuticGoal[];
  closedTopics: string[];
  openTopics: string[];
  recentInterventionTypes: InterventionType[];
  askedInterventionSignatures: InterventionSignature[];
  regressHistory: GoalTransition[];
  goalTransitionHistory: GoalTransition[];
  lastGoalTransitionReason: string | null;
  reflectionLog: SessionReflectionLogEntry[];
}

/** Condensed session memory exported to analytics events. */
export interface SessionMemorySummary {
  breakthroughCount: number;
  completedGoalCount: number;
  effectiveInterventionTypes: InterventionType[];
  closedTopicCount: number;
  regressCount: number;
}
