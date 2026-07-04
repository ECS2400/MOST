/**
 * Priority Engine types for Mediator AI Engine v2.3.
 *
 * Role: resolves competing dynamic signals (escalation, breakthrough, blame loop,
 * evasion, safety) into a single ranked decision context each turn.
 */

import type { ConfidenceScore } from './common';
import type { ConversationMode } from './dynamics';
import type { ConfidenceValue } from './evidence';
import type { InterventionType } from './interventions';

/** Dynamic event types ranked by Priority Engine. */
export type PrioritySignalType =
  | 'safety'
  | 'escalation'
  | 'blame_loop'
  | 'breakthrough'
  | 'evasion'
  | 'stuck';

/**
 * Single active signal with numeric priority rank.
 *
 * Role: lower priority number = higher urgency (P0 safety = 0).
 */
export interface PrioritySignal {
  type: PrioritySignalType;
  priority: number;
  confidence: ConfidenceValue<boolean>;
}

/**
 * Output of Priority Engine for the current turn.
 *
 * Role: constrains Decision Engine and TSE — may preempt goal transitions
 * and forbid intervention types.
 */
export interface PriorityOutput {
  activeSignals: PrioritySignal[];
  conversationMode: ConversationMode;
  allowedInterventionTypes: InterventionType[];
  forbiddenInterventionTypes: InterventionType[];
  /** When true, Decision Engine must not advance the therapeutic goal this turn. */
  preemptsGoalTransition: boolean;
  recommendedInterventionType: InterventionType;
}

/** Alias — public name used in architecture discussions. */
export type Priority = PriorityOutput;

/** Compact summary for Explainability Layer module inputs. */
export interface PriorityOutputSummary {
  conversationMode: ConversationMode;
  topSignalType: PrioritySignalType | null;
  preemptsGoalTransition: boolean;
  recommendedInterventionType: InterventionType;
}
