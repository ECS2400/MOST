/**
 * Priority Engine types for Mediator AI Engine v2.3.
 *
 * Role: resolves competing dynamic signals into a single ranked decision context.
 */

import type { ConfidenceScore } from './common';
import type { ConfidenceValue } from './confidence';
import type { ConversationMode } from './dynamics';
import type { InterventionType, PrioritySignalType } from './engineTypes';

export type { PrioritySignalType } from './engineTypes';

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
 * Role: constrains Decision Engine and TSE — may preempt goal transitions.
 */
export interface PriorityOutput {
  activeSignals: PrioritySignal[];
  conversationMode: ConversationMode;
  allowedInterventionTypes: InterventionType[];
  forbiddenInterventionTypes: InterventionType[];
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
