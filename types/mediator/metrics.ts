/**
 * Metrics Layer and Learning Layer port types for Mediator AI Engine v2.3.
 *
 * Role: post-session analytics contracts. MVP implements types + no-op emitter;
 * future Learning Layer consumes {@link SessionAnalyticsEvent} aggregates.
 */

import type {
  ConfidenceScore,
  MediationId,
  ProgressPercent,
  SessionId,
  SessionOutcome,
} from './common';
import type { TherapeuticGoal } from './therapeuticGoal';
import type { InterventionType } from './interventions';
import type { TherapeuticStrategy } from './strategies';
import type { SessionMemorySummary } from './sessionMemory';
import type { IsoTimestamp, MediatorLang, TurnNumber } from './common';

/** Per-goal metrics row in session analytics export. */
export interface GoalMetricRow {
  goal: TherapeuticGoal;
  status: string;
  attemptCount: number;
  durationMinutes: number;
  checksCompleted: number;
  checksTotal: number;
}

/** Per-intervention-type metrics row in session analytics export. */
export interface InterventionMetricRow {
  type: InterventionType;
  count: number;
  effectiveCount: number;
  precededEscalation: number;
  precededBreakthrough: number;
}

/** Dynamic event counters in session analytics export. */
export interface DynamicEventMetrics {
  escalationCount: number;
  blameLoopCount: number;
  breakthroughCount: number;
  regressCount: number;
  safetyTriggered: boolean;
}

/** Usage statistics for a single intervention type. */
export interface InterventionTypeMetrics {
  count: number;
  effectiveCount: number;
  avgConfidence: ConfidenceScore;
}

/** Usage statistics for a single therapeutic strategy. */
export interface TherapeuticStrategyMetrics {
  count: number;
  ledToProgress: number;
}

/** Usage statistics for a library pattern ID. */
export interface LibraryPatternMetrics {
  count: number;
  effectiveCount: number;
}

/** Breakdown maps keyed by strongly-typed union members (not open string records). */
export interface InterventionBreakdown {
  entries: Array<{ type: InterventionType; metrics: InterventionTypeMetrics }>;
}

export interface StrategyBreakdown {
  entries: Array<{ strategy: TherapeuticStrategy; metrics: TherapeuticStrategyMetrics }>;
}

export interface PatternBreakdown {
  entries: Array<{ patternId: string; metrics: LibraryPatternMetrics }>;
}

/**
 * Full session metrics aggregate computed post-session.
 *
 * Role: primary input to product analytics and future Learning Layer training.
 */
export interface SessionMetrics {
  sessionId: SessionId;
  mediationId: MediationId;
  schemaVersion: '2.3';
  completedAt: IsoTimestamp;
  outcome: SessionOutcome;
  sessionDurationMinutes: number;
  timeToFirstBreakthroughMinutes: number | null;
  timeToFirstGoalCompleteMinutes: number | null;
  averageTurnDurationSeconds: number;
  escalationCount: number;
  escalationPeakTemperature: number;
  blameLoopCount: number;
  recoveryAttemptCount: number;
  recoverySuccessCount: number;
  breakthroughCount: number;
  averageEmotionalTemperature: number;
  peakEmotionalTemperature: number;
  averageEmotionalLoad: number;
  peakEmotionalLoad: number;
  loadExhaustionDetected: boolean;
  goalCompletionRate: ProgressPercent;
  goalSkipRate: ProgressPercent;
  globalObjectiveAchievementRate: ProgressPercent;
  checksConfirmedRate: ProgressPercent;
  finalMutualUnderstandingScore: ProgressPercent;
  agreementScore: ProgressPercent | null;
  interventionEffectivenessRate: ProgressPercent;
  constitutionViolationAttempts: number;
  constitutionViolationRate: ProgressPercent;
  interventionBreakdown: InterventionBreakdown;
  strategyBreakdown: StrategyBreakdown;
  patternBreakdown: PatternBreakdown;
  confidenceDecayEvents: number;
  reconfirmationRequiredCount: number;
  regressCount: number;
  staleConclusionRate: ProgressPercent;
  dropOffGoal: TherapeuticGoal | null;
  dropOffTurn: TurnNumber | null;
}

/**
 * Event emitted once when a session ends — Learning Layer input.
 *
 * Role: lighter-weight export for MVP analytics pipeline (no-op in Phase 0).
 */
export interface SessionAnalyticsEvent {
  sessionId: SessionId;
  mediationId: MediationId;
  schemaVersion: 2;
  completedAt: IsoTimestamp;
  outcome: SessionOutcome;
  durationMinutes: number;
  language: MediatorLang;
  surfaceTopic: string | null;
  deepTheme: string | null;
  goalMetrics: GoalMetricRow[];
  interventionMetrics: InterventionMetricRow[];
  dynamicEvents: DynamicEventMetrics;
  dropOffGoal: TherapeuticGoal | null;
  sessionMemorySnapshot: SessionMemorySummary;
}

/**
 * Port interface for future Learning Layer integration.
 *
 * Role: MVP implements no-op; production may write to Supabase or warehouse.
 */
export interface LearningLayerPort {
  emitSessionAnalytics: (event: SessionAnalyticsEvent) => Promise<void>;
}

/** Alias — public architecture name for {@link SessionMetrics}. */
export type Metrics = SessionMetrics;
