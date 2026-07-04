/**
 * Conversation dynamics, pace, load, and emotional temperature.
 *
 * Role: captures the felt quality of the dialogue — distinct from goal progress.
 */

import type {
  ConfidenceScore,
  IntensityScore,
  IsoTimestamp,
  ProgressPercent,
  UserId,
} from './common';
import type { ConfidenceValue } from './confidence';
import type {
  BreakthroughType,
  ConversationMode,
  ConversationPace,
  TrendDirection,
} from './engineTypes';
import type { GoalTransition } from './goals';
import type {
  BreakthroughEvent,
  FactMemoryEntry,
  MediatorAction,
} from './participants';
import type { TherapeuticGoal } from './therapeuticGoal';

export type { ConversationMode, ConversationPace, TrendDirection } from './engineTypes';

/**
 * Emotional temperature of the conversation (distinct from individual load).
 *
 * Role: measures intensity and reactivity of the dialogue as a whole.
 */
export interface EmotionalTemperature {
  current: IntensityScore;
  trend: TrendDirection;
  assessed: ConfidenceValue<IntensityScore>;
  peak: IntensityScore;
  peakAtTurn: number | null;
}

/**
 * Emotional load per participant and session aggregate.
 *
 * Role: detects exhaustion and disengagement even when temperature is moderate.
 */
export interface EmotionalLoad {
  host: ConfidenceValue<IntensityScore>;
  partner: ConfidenceValue<IntensityScore>;
  overall: IntensityScore;
  trend: TrendDirection;
  exhaustionDetected: ConfidenceValue<boolean>;
  disengagementRisk: ConfidenceValue<boolean>;
}

/** Alias used in Strategy Engine inputs (architecture name). */
export type EmotionalLoadState = EmotionalLoad;

/**
 * Real-time dynamics of the conversation.
 *
 * Role: central snapshot consumed by Priority and Strategy engines each turn.
 */
export interface ConversationDynamics {
  mode: ConversationMode;
  emotionalTemperature: IntensityScore;
  temperatureTrend: TrendDirection;
  breakthroughDetected: boolean;
  breakthroughQuote: string | null;
  breakthroughAt: IsoTimestamp | null;
  blameLoopDetected: boolean;
  blameLoopCount: number;
  escalationDetected: boolean;
  escalationLevel: number;
  mutualUnderstandingScore: ProgressPercent;
  agreementLevel: ProgressPercent;
  lastStableGoal: TherapeuticGoal;
  pauseSuggested: boolean;
  pauseAcceptedBy: UserId[];
}

/**
 * Stateful pace tracking with anti-oscillation guard.
 *
 * Role: persisted in MediationState; modulates intervention length and type.
 */
export interface PaceState {
  current: ConversationPace;
  confidence: ConfidenceScore;
  reason: string;
  sinceTurn: number;
  minTurnsBeforeChange: number;
}

/** Bundle of dynamic signals passed to Strategy Engine with confidence wrappers. */
export interface DynamicsSignalBundle {
  temperature: ConfidenceValue<IntensityScore>;
  escalation: ConfidenceValue<boolean>;
  blameLoop: ConfidenceValue<boolean>;
  breakthrough: ConfidenceValue<BreakthroughType | null>;
  evasion: ConfidenceValue<boolean>;
  mutualUnderstanding: ConfidenceValue<ProgressPercent>;
}

/**
 * Short-term conversation memory for anti-repeat and audit.
 *
 * Role: operational memory within MediationState (distinct from SessionMemory).
 */
export interface ConversationMemory {
  askedQuestionSignatures: string[];
  recentMediatorMoves: MediatorAction[];
  coveredTopics: string[];
  factMemory: FactMemoryEntry[];
  breakthroughHistory: BreakthroughEvent[];
  regressHistory: GoalTransition[];
}
