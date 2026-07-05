import type { ConfidenceScore } from '@/types/mediator';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import { STRATEGY_CONFIDENCE } from '@/services/mediatorEngine/strategy/config/strategyPriorities';

/** Clamps confidence to valid 0–100 range. */
export function clampConfidence(value: number): ConfidenceScore {
  if (!Number.isFinite(value)) return STRATEGY_CONFIDENCE.fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Maps a priority tier to a deterministic confidence score. */
export function confidenceForPriority(priority: StrategyPriorityKey | 'fallback'): ConfidenceScore {
  switch (priority) {
    case 'SAFETY':
      return STRATEGY_CONFIDENCE.safety;
    case 'RECOVERY':
      return STRATEGY_CONFIDENCE.recovery;
    case 'ESCALATION':
      return STRATEGY_CONFIDENCE.escalation;
    case 'EXHAUSTION':
      return STRATEGY_CONFIDENCE.exhaustion;
    case 'BREAKTHROUGH':
      return STRATEGY_CONFIDENCE.breakthrough;
    case 'GOAL_DEFAULT':
      return STRATEGY_CONFIDENCE.goalDefault;
    default:
      return STRATEGY_CONFIDENCE.fallback;
  }
}
