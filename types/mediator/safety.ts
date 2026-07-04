/**
 * Human Safety Layer types for Mediator AI Engine v2.3.
 *
 * Role: detects exceptional partner distress and preempts the standard
 * mediation pipeline. Always P0 — above escalation, breakthrough, and goals.
 */

import type { ConfidenceScore, IsoTimestamp, TurnNumber } from './common';
import type { ConfidenceValue } from './evidence';
import type { InterventionType } from './interventions';

/** Category of safety signal detected in partner messages. */
export type SafetySignalCategory =
  | 'hopelessness'
  | 'withdrawal'
  | 'severe_distress'
  | 'silence'
  | 'complete_disengagement'
  | 'self_harm_hint'
  | 'abuse_hint';

/** Response level triggered by accumulated safety signals. */
export type SafetyLevel = 'none' | 'L1_gentle' | 'L2_pause' | 'L3_stop';

/**
 * Detected safety signal with confidence and source quote.
 *
 * Role: input to Safety Layer aggregation before preemption decision.
 */
export interface SafetySignal {
  category: SafetySignalCategory;
  confidence: ConfidenceScore;
  quote: string;
  detectedAt: IsoTimestamp;
  turnNumber: TurnNumber;
  detectionLayer: 'regex' | 'heuristic' | 'llm';
}

/**
 * Output of Human Safety Layer when evaluated each turn.
 *
 * Role: when preempted=true, orchestrator skips standard pipeline and emits
 * safety_response or pause_session intervention directly.
 */
export interface SafetyOutput {
  level: SafetyLevel;
  preempted: boolean;
  signals: SafetySignal[];
  recommendedInterventionType: InterventionType;
  blockGoalTransitions: boolean;
  blockStandardInterventions: boolean;
  /** Allowed types under safety preemption (validate, pause, safety_response, etc.). */
  allowedInterventionTypes: InterventionType[];
  assessed: ConfidenceValue<boolean>;
}
