/**
 * Human Safety Layer types for Mediator AI Engine v2.3.
 *
 * Role: detects exceptional partner distress and preempts the standard pipeline.
 */

import type { ConfidenceScore, IsoTimestamp, MediatorEntityId, TurnNumber } from './common';
import type { ConfidenceValue } from './confidence';
import type {
  InterventionType,
  SafetyLevel,
  SafetySignalCategory,
} from './engineTypes';
import type { MediationState } from './mediationState';
import type { TranscriptMessage } from './reflection';

export type { SafetyLevel, SafetySignalCategory } from './engineTypes';

/**
 * Detected safety signal — structural metadata only, no user message content.
 *
 * Role: input to Safety Layer aggregation before preemption decision.
 */
export interface SafetySignal {
  category: SafetySignalCategory;
  confidence: ConfidenceScore;
  matchedPatternId: string;
  messageId: string | null;
  /** Stable reference: `{patternId}:{messageId|state}`. */
  evidenceRef: string;
  detectedAt: IsoTimestamp;
  turnNumber: TurnNumber;
  detectionLayer: 'regex' | 'heuristic';
  quote?: never;
}

/** Input to Human Safety Layer for a single turn. */
export interface SafetyInput {
  state: MediationState;
  transcriptDelta: TranscriptMessage[];
  turnNumber: TurnNumber;
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
