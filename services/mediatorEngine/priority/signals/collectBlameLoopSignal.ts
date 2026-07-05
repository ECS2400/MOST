import { BLAME_LOOP_INTERVENTIONS } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import {
  BLAME_LOOP_COUNT_THRESHOLD,
  PRIORITY_RANKS,
} from '@/services/mediatorEngine/priority/config/priorityRanks';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import { getBlameLoopMetrics } from '@/services/mediatorEngine/priority/lib/safeState';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects blame loop signal from conversation dynamics. */
export const collectBlameLoopSignal: PrioritySignalCollector = {
  type: 'blame_loop',
  collect(ctx) {
    const { detected, count } = getBlameLoopMetrics(ctx.input.state);
    if (!detected && count < BLAME_LOOP_COUNT_THRESHOLD) return null;

    return {
      type: 'blame_loop',
      priority: PRIORITY_RANKS.blame_loop,
      confidence: activeSignalConfidence(75 + Math.min(count * 5, 20)),
      reason: `Blame loop detected (count ${count})`,
      recommendedInterventionType: BLAME_LOOP_INTERVENTIONS[0],
    };
  },
};
