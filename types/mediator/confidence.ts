/**
 * Confidence assessment primitives for Mediator AI Engine v2.3.
 *
 * Role: lightweight confidence wrapper used by detectors, dynamics, and
 * Reflection — independent of Evidence Layer storage types.
 */

import type { ConfidenceScore, IsoTimestamp } from './common';

/** Source category of a lightweight confidence assessment. */
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
