import { BREAKTHROUGH_INTERVENTIONS } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import { isBreakthroughDetected } from '@/services/mediatorEngine/priority/lib/safeState';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects breakthrough signal from conversation dynamics. */
export const collectBreakthroughSignal: PrioritySignalCollector = {
  type: 'breakthrough',
  collect(ctx) {
    if (!isBreakthroughDetected(ctx.input.state)) return null;

    const strategy = ctx.input.strategy?.primaryStrategy;
    const recommended =
      strategy === 'consolidate_progress'
        ? 'celebrate_breakthrough'
        : BREAKTHROUGH_INTERVENTIONS[0];

    return {
      type: 'breakthrough',
      priority: PRIORITY_RANKS.breakthrough,
      confidence: activeSignalConfidence(80),
      reason: 'Breakthrough detected in conversation dynamics',
      recommendedInterventionType: recommended,
    };
  },
};
