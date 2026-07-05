import type { ConfidenceValue } from '@/types/mediator';
import { STATE_ANALYZER_LIMITS } from '@/services/mediatorEngine/stateAnalyzer/config/stateAnalyzerLimits';

function decayTurns(turnsElapsed: number): number {
  if (turnsElapsed <= 0) return 0;
  return Math.max(0, turnsElapsed - (STATE_ANALYZER_LIMITS.decayStartAfterTurns - 1));
}

/** Applies confidence decay to a single ConfidenceValue field. */
export function decayConfidenceValue<T>(
  value: ConfidenceValue<T>,
  turnsElapsed: number
): { next: ConfidenceValue<T>; decayApplied: boolean } {
  if (value.stale || turnsElapsed <= 0) {
    return { next: value, decayApplied: false };
  }

  const applicableTurns = decayTurns(turnsElapsed);
  if (applicableTurns <= 0) {
    return { next: value, decayApplied: false };
  }

  const reduction = applicableTurns * STATE_ANALYZER_LIMITS.decayPercentPerTurn;
  const nextConfidence = Math.max(0, value.confidence - reduction);
  const stale = nextConfidence < STATE_ANALYZER_LIMITS.staleConfidenceThreshold;

  return {
    next: {
      ...value,
      confidence: nextConfidence,
      stale,
    },
    decayApplied: reduction > 0,
  };
}
