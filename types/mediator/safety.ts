/**
 * Human Safety Layer types for Mediator AI Engine v2.3.
 *
 * Role: detects exceptional partner distress and preempts the standard pipeline.
 */

import type { ConfidenceScore, IsoTimestamp, TurnNumber } from './common';
import type { ConfidenceValue } from './confidence';
import type {
  InterventionType,
  SafetyLevel,
  SafetySignalCategory,
} from './engineTypes';

export type { SafetyLevel, SafetySignalCategory } from './engineTypes';

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
 * Role: when preempted=true, orchestrator skips standard pipeline.
 */
export interface SafetyOutput {
  level: SafetyLevel;
  preempted: boolean;
  signals: SafetySignal[];
  recommendedInterventionType: InterventionType;
  blockGoalTransitions: boolean;
  blockStandardInterventions: boolean;
  allowedInterventionTypes: InterventionType[];
  assessed: ConfidenceValue<boolean>;
}
