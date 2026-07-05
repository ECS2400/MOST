import type { ConfidenceScore } from '@/types/mediator';
import type { ConfidenceValue } from '@/types/mediator';

/** Builds a deterministic confidence wrapper for reflection assessments. */
export function reflectionConfidence<T>(
  value: T,
  confidence: ConfidenceScore,
  evidence: string[] = []
): ConfidenceValue<T> {
  return {
    value,
    confidence,
    source: 'heuristic',
    evidence,
    assessedAt: new Date().toISOString(),
    stale: false,
  };
}

/** Maps a ratio of satisfied structural checks to a confidence score. */
export function confidenceFromRatio(met: number, total: number): ConfidenceScore {
  if (total <= 0) return 0;
  const ratio = met / total;
  if (ratio >= 1) return 85;
  if (ratio >= 0.5) return 65;
  if (ratio > 0) return 50;
  return 40;
}
