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
} from './engineTypes';
import type { GoalTransition } from './goals';
import type { ComplianceResult } from './constitution';
import type { Intervention } from './interventions';
import type { MediationState } from './mediationState';
import type { ReflectionEntry, ReflectionOutput } from './reflection';
import type { TherapeuticGoal } from './therapeuticGoal';

/** Breakthrough record in session memory. */
export interface SessionBreakthroughRecord {
  quote: string;
  type: BreakthroughType;
  confidence: ConfidenceScore;
  turnNumber: TurnNumber;
  participant: ParticipantRole;
}

/** Intervention effectiveness record in session memory. */
export interface InterventionHistoryEntry {
  turnNumber: TurnNumber;
  type: InterventionType;
  goal: TherapeuticGoal;
  effective: boolean | null;
  confidence: ConfidenceScore;
  signature: InterventionSignature;
}

/** Input to Session Memory update pipeline step. */
export interface SessionMemoryUpdateInput {
  previousMemory: SessionMemory;
  state: MediationState;
  intervention: Intervention;
  reflection: ReflectionOutput;
  complianceResult: ComplianceResult;
  turnNumber: TurnNumber;
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
  reflectionLog: ReflectionEntry[];
}

/** Condensed session memory exported to analytics events. */
export interface SessionMemorySummary {
  breakthroughCount: number;
  completedGoalCount: number;
  effectiveInterventionTypes: InterventionType[];
  closedTopicCount: number;
  regressCount: number;
}
