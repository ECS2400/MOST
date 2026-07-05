import type { ConfidenceScore } from '@/types/mediator';
import type { ConfidenceValue } from '@/types/mediator';

const TIMESTAMP = '1970-01-01T00:00:00.000Z';

/** Builds a deterministic active confidence wrapper for priority signals. */
export function activeSignalConfidence(
  confidence: ConfidenceScore,
  evidence: string[] = []
): ConfidenceValue<boolean> {
  return {
    value: true,
    confidence,
    source: 'heuristic',
    evidence,
    assessedAt: TIMESTAMP,
    stale: false,
  };
}

/** Reads numeric confidence from a {@link ConfidenceValue} field — never throws. */
export function readConfidenceScore(
  field: ConfidenceValue<boolean> | ConfidenceValue<number> | null | undefined,
  fallback = 0
): number {
  if (!field || typeof field !== 'object') return fallback;
  return typeof field.confidence === 'number' ? field.confidence : fallback;
}

/** Reads boolean value from a {@link ConfidenceValue} field — never throws. */
export function readConfidenceBoolean(
  field: ConfidenceValue<boolean> | null | undefined,
  fallback = false
): boolean {
  if (!field || typeof field !== 'object') return fallback;
  return typeof field.value === 'boolean' ? field.value : fallback;
}
