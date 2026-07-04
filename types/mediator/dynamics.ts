/**
 * Conversation dynamics, pace, load, and emotional temperature.
 *
 * Role: captures the *felt* quality of the dialogue — distinct from goal progress.
 * Feeds Priority Engine, Therapeutic Strategy Engine, and Metrics Layer.
 */

import type {
  ConfidenceScore,
  IntensityScore,
  IsoTimestamp,
  ParticipantRole,
  ProgressPercent,
  UserId,
} from './common';
import type { BreakthroughType } from './participants';
import type { TherapeuticGoal } from './therapeuticGoal';
import type { ConfidenceValue } from './evidence';
import type {
  BreakthroughEvent,
  FactMemoryEntry,
  MediatorAction,
} from './participants';
import type { GoalTransition } from './goals';

/** High-level conversation mode set by Priority Engine. */
export type ConversationMode =
  | 'NORMAL'
  | 'DE_ESCALATING'
  | 'REDIRECTING'
  | 'BREAKTHROUGH'
  | 'SAFETY';

/** Trend direction for emotional temperature or load over recent turns. */
export type TrendDirection = 'rising' | 'stable' | 'falling';

/**
 * Emotional temperature of the conversation (distinct from individual load).
 *
 * Role: measures intensity and reactivity of the dialogue as a whole.
 * High temperature triggers de-escalation strategies (Constitution Art. 4, 7).
 */
export interface EmotionalTemperature {
  /** Current level 0 (calm) – 10 (critical). */
  current: IntensityScore;
  trend: TrendDirection;
  /** Evidenced conclusion wrapping the scalar for pipeline modules. */
  assessed: ConfidenceValue<IntensityScore>;
  peak: IntensityScore;
  peakAtTurn: number | null;
}

/**
 * Emotional load per participant and session aggregate.
 *
 * Role: detects exhaustion and disengagement even when temperature is moderate.
 * High load blocks deepen_emotions and prepare_agreement strategies.
 */
export interface EmotionalLoad {
  host: ConfidenceValue<IntensityScore>;
  partner: ConfidenceValue<IntensityScore>;
  /** max(host, partner) — session-level load indicator. */
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
  /** Goal to return to after de-escalation regress. */
  lastStableGoal: TherapeuticGoal;
  pauseSuggested: boolean;
  pauseAcceptedBy: UserId[];
}

/** Therapeutic tempo of the session — slow / normal / fast. */
export type ConversationPace = 'slow' | 'normal' | 'fast';

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
  /** Minimum turns before pace may change again (default 2). */
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
