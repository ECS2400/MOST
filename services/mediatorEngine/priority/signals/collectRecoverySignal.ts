import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import { getRecovery } from '@/services/mediatorEngine/priority/lib/safeState';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects active recovery signal from mediation state. */
export const collectRecoverySignal: PrioritySignalCollector = {
  type: 'recovery',
  collect(ctx) {
    const recovery = getRecovery(ctx.input.state);
    if (!recovery?.active) return null;

    return {
      type: 'recovery',
      priority: PRIORITY_RANKS.recovery,
      confidence: activeSignalConfidence(recovery.confidence, [recovery.triggerQuote]),
      reason: `Recovery active (${recovery.trigger})`,
      recommendedInterventionType: 'recover_acknowledge',
    };
  },
};
