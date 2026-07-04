/**
 * Therapeutic goals, expected outcomes, and checklist model.
 *
 * Role: defines the state-machine nodes of mediation. Each {@link TherapeuticGoal}
 * has observable {@link ExpectedOutcome} criteria expressed as {@link OutcomeCheck}
 * items. Checklists — not percentages — drive forward transitions.
 */

import type { IsoTimestamp, ProgressPercent } from './common';
import type { TherapeuticGoal as TG } from './therapeuticGoal';

export type { TherapeuticGoal } from './therapeuticGoal';

/** Lifecycle status of a single therapeutic goal within a session. */
export type GoalStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked';

/** Status of an individual checklist item within an expected outcome. */
export type CheckStatus =
  | 'pending'
  | 'likely'
  | 'confirmed'
  | 'failed'
  | 'skipped';

/** Source that confirmed a checklist item. */
export type CheckConfirmationSource =
  | 'checklist_rule'
  | 'llm'
  | 'user_signal'
  | 'mediator_action';

/**
 * Single observable criterion that must hold before a goal can advance.
 *
 * Role: atomic unit of the checklist model. Required items gate transitions;
 * optional items inform strategy but never block advance.
 */
export interface OutcomeCheck {
  /** Stable identifier, e.g. `emotion_host_named`. */
  id: string;
  /** Human-readable description for logs and explainability. */
  label: string;
  /** When true, must reach `confirmed` before goal advance. */
  required: boolean;
  status: CheckStatus;
  /** Confidence of the most recent assessment (0–100). */
  confidence: number;
  /** Evidence item IDs or inline quote references supporting the status. */
  evidence: string[];
  confirmedAt: IsoTimestamp | null;
  confirmedBy: CheckConfirmationSource | null;
}

/**
 * Expected observable result of completing a therapeutic goal.
 *
 * Role: bridges therapeutic intent and verification — defines *what success
 * looks like* before the mediator selects interventions.
 */
export interface ExpectedOutcome {
  goal: TG;
  /** Narrative description of the desired end state. */
  description: string;
  /** Checklist items that operationalise the expected outcome. */
  checks: OutcomeCheck[];
}

/**
 * Checklist attached to a therapeutic goal — alias for the checks collection
 * with goal context.
 *
 * Role: consumed by Decision Engine and State Analyzer to evaluate readiness.
 */
export interface Checklist {
  goal: TG;
  checks: OutcomeCheck[];
  /** Count of required checks currently in `confirmed` state. */
  confirmedRequiredCount: number;
  /** Total number of required checks for this goal. */
  totalRequiredCount: number;
}

/**
 * Full goal state including checklist and derived progress cache.
 *
 * Role: persisted inside {@link MediationState.goals}; supersedes legacy GoalProgress.
 */
export interface GoalState {
  goal: TG;
  status: GoalStatus;
  checks: OutcomeCheck[];
  /** Derived cache — informational only, never drives transitions. */
  progressPercent: ProgressPercent;
  startedAt: IsoTimestamp | null;
  completedAt: IsoTimestamp | null;
  attemptCount: number;
}

/**
 * Lightweight progress record used in metrics and session memory.
 *
 * Role: historical snapshot; prefer {@link GoalState} for active session logic.
 */
export interface GoalProgress {
  goal: TG;
  status: GoalStatus;
  startedAt: IsoTimestamp | null;
  completedAt: IsoTimestamp | null;
  /** Quote or signal IDs evidencing completion. */
  completionEvidence: string[];
  attemptsCount: number;
  /** Soft limit — exceeding triggers strategy change, not hard failure. */
  maxAttemptsSoft: number;
  /** Evaluator-assigned progress score (0–100), secondary to checklist. */
  progressScore: ProgressPercent;
}

/** Direction of a goal transition in the state machine. */
export type GoalTransitionDirection =
  | 'advance'
  | 'regress'
  | 'skip'
  | 'stay';

/**
 * Audit record of a goal transition (forward or backward).
 *
 * Role: stored in session memory for explainability and Learning Layer.
 */
export interface GoalTransition {
  fromGoal: TG;
  toGoal: TG;
  direction: GoalTransitionDirection;
  turnNumber: number;
  timestamp: IsoTimestamp;
  reason: string;
  triggeredBy: 'decision_engine' | 'priority_engine' | 'safety_layer' | 'recovery';
}

/**
 * Session-wide objective spanning multiple therapeutic goals.
 *
 * Role: Global Session Objectives (v2.3) — TSE optimises toward these even when
 * the current goal could advance faster in isolation.
 */
export interface GlobalSessionObjective {
  id: string;
  description: string;
  /** Observable end-state phrased for product analytics. */
  measurableOutcome: string;
  status: 'pending' | 'in_progress' | 'achieved' | 'partial' | 'abandoned';
  progressPercent: ProgressPercent;
  linkedGoals: TG[];
  /** Priority rank 1–3; max 3 objectives per session. */
  priority: number;
}

/**
 * Container for session objectives established during SAFE_OPENING.
 *
 * Role: input to Therapeutic Strategy Engine for long-horizon optimisation.
 */
export interface SessionObjectives {
  objectives: GlobalSessionObjective[];
  primaryObjectiveId: string;
  establishedAt: IsoTimestamp;
  /** At most one revision allowed per session. */
  revisedAt: IsoTimestamp | null;
}
