/**
 * Session memory types for Mediator AI Engine v2.3.
 *
 * Role: condensed operational knowledge accumulated during one session.
 * Answers anti-repeat, effectiveness, and closure summarisation questions
 * without re-scanning the full transcript each turn.
 */

import type { ConfidenceScore, InterventionSignature, IsoTimestamp, ParticipantRole, TurnNumber } from './common';
import type { ConfidenceValue } from './evidence';
import type { GoalTransition } from './goals';
import type { InterventionType } from './interventions';
import type { BreakthroughType, EmotionLabel, NeedLabel } from './participants';
import type { ReflectionEntry } from './reflection';
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
  /** null until Reflection evaluates expected effect. */
  effective: boolean | null;
  confidence: ConfidenceScore;
  signature: InterventionSignature;
}

/**
 * Operational memory persisted across turns within a single session.
 *
 * Role: updated by SESSION MEMORY UPDATE pipeline step after each turn.
 * Size limits enforced by implementer (see architecture §9.4).
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
