import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { primaryInterventionForStrategy } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Always-on fallback signal derived from Strategy Engine output. */
export const collectDefaultStrategySignal: PrioritySignalCollector = {
  type: 'default_strategy',
  collect(ctx) {
    const strategy = ctx.input.strategy?.primaryStrategy ?? 'build_safety';
    const confidence = ctx.input.strategy?.confidence ?? 50;

    return {
      type: 'default_strategy',
      priority: PRIORITY_RANKS.default_strategy,
      confidence: activeSignalConfidence(confidence),
      reason: `Default strategy fallback (${strategy})`,
      recommendedInterventionType: primaryInterventionForStrategy(strategy),
    };
  },
};
