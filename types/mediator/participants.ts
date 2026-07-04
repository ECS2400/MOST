/**
 * Participant and conflict models for Mediator AI Engine v2.3.
 *
 * Role: describes who is in the session and what they are mediating about —
 * surface-level topics and deep emotional themes.
 */

import type {
  ConfidenceScore,
  IsoTimestamp,
  MediatorLang,
  MediationId,
  MediationStateSchemaVersion,
  ParticipantRole,
  SessionId,
  UserId,
} from './common';

/** Surface-level conflict topic taxonomy. */
export type SurfaceTopic =
  | 'money'
  | 'chores'
  | 'children'
  | 'jealousy'
  | 'intimacy'
  | 'family'
  | 'communication'
  | 'time'
  | 'other';

/** Deep emotional theme underlying the surface conflict. */
export type DeepTheme =
  | 'safety'
  | 'respect'
  | 'loneliness'
  | 'rejection'
  | 'influence'
  | 'fairness'
  | 'not_heard'
  | 'fear'
  | 'trust_loss'
  | 'other';

/** Standardised emotion labels used in choice interventions and state tracking. */
export type EmotionLabel =
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'frustration'
  | 'hurt'
  | 'disappointment'
  | 'loneliness'
  | 'shame'
  | 'guilt'
  | 'anxiety'
  | 'resentment'
  | 'overwhelm'
  | 'other';

/** Standardised need labels used in need-naming interventions. */
export type NeedLabel =
  | 'respect'
  | 'safety'
  | 'understanding'
  | 'connection'
  | 'fairness'
  | 'autonomy'
  | 'support'
  | 'recognition'
  | 'peace'
  | 'trust'
  | 'closeness'
  | 'other';

/** How confidently a participant named their emotion (0 = unsure, 3 = explicit). */
export type EmotionNamingConfidence = 0 | 1 | 2 | 3;

/** Detected tone of the participant's most recent message. */
export type MessageTone =
  | 'calm'
  | 'elevated'
  | 'accusatory'
  | 'vulnerable'
  | 'reconciliatory';

/**
 * Static participant profile for the session.
 *
 * Role: identity layer — does not change during mediation.
 */
export interface ParticipantProfile {
  userId: UserId;
  displayName: string;
  role: ParticipantRole;
}

/**
 * Dynamic per-participant state tracked across turns.
 *
 * Role: primary input to State Analyzer and Reflection Engine.
 * Updated after each partner message and mediator intervention.
 */
export interface ParticipantState {
  profile: ParticipantProfile;
  namedEmotion: EmotionLabel | null;
  emotionConfidence: EmotionNamingConfidence;
  emotionExplanation: string | null;
  emotionValidated: boolean;
  emotionAcknowledgedByOther: boolean;
  namedNeed: NeedLabel | null;
  needExplanation: string | null;
  needValidated: boolean;
  feelsHeard: boolean;
  feelsUnderstood: boolean;
  feelsRespected: boolean;
  lastMessageTone: MessageTone;
  consecutiveEvasiveAnswers: number;
  consecutiveAccusatoryMessages: number;
  lastStatementSummary: string | null;
}

/** Pre-analysis context imported from analyze-perspectives edge function. */
export interface PreAnalysisContext {
  hostEmotions: string[];
  hostNeeds: string[];
  partnerEmotions: string[];
  partnerNeeds: string[];
  keyTrigger: string | null;
}

/**
 * Model of the conflict being mediated — surface and deep layers.
 *
 * Role: anchors SAFE_OPENING and REFRAME goals; informs Global Session Objectives.
 */
export interface ConflictModel {
  surfaceTopic: SurfaceTopic | null;
  surfaceTopicConfidence: ConfidenceScore;
  /** Max 3 hypotheses during SAFE_OPENING. */
  hypothesizedDeepThemes: DeepTheme[];
  confirmedDeepTheme: DeepTheme | null;
  conflictSummary: string;
  preAnalysisContext: PreAnalysisContext;
}

/**
 * Session metadata persisted with {@link MediationState}.
 *
 * Role: versioning, identity, and audit timestamps for state serialisation.
 */
export interface MediationStateMeta {
  schemaVersion: MediationStateSchemaVersion;
  sessionId: SessionId;
  mediationId: MediationId;
  language: MediatorLang;
  startedAt: IsoTimestamp;
  lastUpdatedAt: IsoTimestamp;
  currentTurnNumber: number;
}

/** Pair of host and partner states — canonical shape inside MediationState. */
export interface ParticipantStates {
  host: ParticipantState;
  partner: ParticipantState;
}

/**
 * Fact remembered from conversation (compatible with legacy FactMemoryEntry shape).
 *
 * Role: prevents re-asking about established facts; stored in ConversationMemory.
 */
export interface FactMemoryEntry {
  id: string;
  speaker: ParticipantRole | 'unknown';
  fact: string;
  relatedGoalId: string | null;
  confidence: ConfidenceScore;
  sourceTurnNumber: number | null;
}

/**
 * Record of a detected breakthrough moment.
 *
 * Role: auditable history alongside SessionMemory.breakthroughs.
 */
export interface BreakthroughEvent {
  quote: string;
  type: BreakthroughType;
  confidence: ConfidenceScore;
  turnNumber: number;
  participant: ParticipantRole;
  detectedAt: IsoTimestamp;
}

/** Classification of a breakthrough detected during mediation. */
export type BreakthroughType =
  | 'apology'
  | 'vulnerability'
  | 'mutual_understanding'
  | 'perspective_shift'
  | 'need_acknowledgment'
  | 'reconciliation'
  | 'ownership'
  | 'other';

/** Types of mediator actions recorded in conversation memory. */
export type MediatorActionType =
  | 'intervention'
  | 'summary'
  | 'question'
  | 'validation'
  | 'pause_proposal'
  | 'safety_response'
  | 'goal_transition';

/**
 * Lightweight record of a mediator move for anti-repeat tracking.
 *
 * Role: last N entries in ConversationMemory.recentMediatorMoves.
 */
export interface MediatorAction {
  id: string;
  type: MediatorActionType;
  turnNumber: number;
  timestamp: IsoTimestamp;
  goalAtTime: import('./therapeuticGoal').TherapeuticGoal;
  signature: string;
}
