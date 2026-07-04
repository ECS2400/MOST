/**
 * Evidence Layer and confidence model for Mediator AI Engine v2.3.
 *
 * Role: every significant AI conclusion must be traceable to {@link EvidenceItem}
 * records. {@link EvidencedConclusion} wraps values with confidence, decay,
 * and provenance for State Analyzer, Reflection, and Explainability.
 */

import type {
  ConfidenceScore,
  IsoTimestamp,
  MediatorEntityId,
  TurnNumber,
} from './common';
import type { BreakthroughType } from './participants';
import type { EmotionLabel, NeedLabel } from './participants';
import type { TherapeuticStrategy } from './strategies';

/** Origin of a piece of evidence supporting a conclusion. */
export type EvidenceSource =
  | 'user_quote'
  | 'transcript_fragment'
  | 'linguistic_signal'
  | 'emotional_signal'
  | 'heuristic_rule'
  | 'llm_analysis'
  | 'checklist_rule'
  | 'cross_module'
  | 'prior_session'
  | 'pre_analysis';

/** How a conclusion's confidence score was derived from evidence weights. */
export type ConfidenceMethod =
  | 'weighted_sum'
  | 'max_source'
  | 'checklist_gate';

/** Source category of a lightweight confidence assessment (pre-evidence layer). */
export type ConfidenceAssessmentSource =
  | 'regex'
  | 'heuristic'
  | 'llm'
  | 'user_explicit'
  | 'checklist';

/**
 * Lightweight confidence wrapper for inline state fields and detector output.
 *
 * Role: used before full Evidence Layer bundling; still requires quote evidence
 * when confidence ≥ 70.
 */
export interface ConfidenceValue<T> {
  value: T;
  confidence: ConfidenceScore;
  source: ConfidenceAssessmentSource;
  /** Inline quote snippets — max 3; prefer EvidenceItem IDs in pipeline modules. */
  evidence: string[];
  assessedAt: IsoTimestamp;
  stale: boolean;
}

/**
 * Single traceable piece of evidence supporting a conclusion.
 *
 * Role: atomic unit of the Evidence Layer — answers "why did the mediator
 * believe this?"
 */
export interface EvidenceItem {
  id: MediatorEntityId;
  source: EvidenceSource;
  /** Quote text or heuristic description. */
  content: string;
  messageIds?: string[];
  turnNumber?: TurnNumber;
  /** Contribution weight 0.0–1.0 toward parent conclusion confidence. */
  weight: number;
  polarity: 'supports' | 'contradicts' | 'neutral';
  detectedAt: IsoTimestamp;
  /** Set by Confidence Decay pass when evidence ages out. */
  stale: boolean;
}

/** Closed union of values storable in {@link EvidenceStore}. Avoids `unknown`. */
export type EvidencedConclusionValue =
  | boolean
  | number
  | string
  | EmotionLabel
  | NeedLabel
  | BreakthroughType
  | TherapeuticStrategy
  | null;

/**
 * A conclusion backed by weighted evidence and decay metadata.
 *
 * Role: canonical output shape of State Analyzer for all significant analyses
 * (emotions, escalation, readiness, temperature, etc.).
 */
export interface EvidencedConclusion<T extends EvidencedConclusionValue = EvidencedConclusionValue> {
  analysisId: MediatorEntityId;
  value: T;
  confidence: ConfidenceScore;
  confidenceMethod: ConfidenceMethod;
  evidence: EvidenceItem[];
  /** IDs of other conclusions in the derivation chain. */
  derivedFrom: MediatorEntityId[];
  assessedAt: IsoTimestamp;
  assessedAtTurn: TurnNumber;
  stale: boolean;
  /** Current decay multiplier 0.0–1.0 applied to confidence. */
  decayFactor: number;
  requiresReconfirmation: boolean;
}

/**
 * In-session store of evidenced conclusions keyed by analysisId.
 *
 * Role: cross-cutting data contract shared by all pipeline modules.
 * FIFO-evicts oldest entries beyond maxConclusions (default 80).
 */
export interface EvidenceStore {
  conclusions: Record<MediatorEntityId, EvidencedConclusion>;
  indexByTurn: Record<TurnNumber, MediatorEntityId[]>;
  maxConclusions: number;
}

/** Trigger that accelerates confidence decay for affected conclusions. */
export type DecayTriggerType =
  | 'contradicting_quote'
  | 'goal_regress'
  | 'recovery'
  | 'topic_shift'
  | 'time_elapsed';

/**
 * Configuration for the Confidence Decay pass in State Analyzer.
 *
 * Role: prevents decisions on stale conclusions from early session turns.
 */
export interface DecayPolicy {
  baseDecayPerTurn: number;
  acceleratedDecayTriggers: DecayTrigger[];
  minimumConfidence: ConfidenceScore;
  reconfirmationThreshold: ConfidenceScore;
}

/** Single accelerated decay rule within {@link DecayPolicy}. */
export interface DecayTrigger {
  type: DecayTriggerType;
  decayBonus: number;
}

/** Alias — Evidence Layer public name for {@link EvidenceItem}. */
export type Evidence = EvidenceItem;
