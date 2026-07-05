import { EXHAUSTION_INTERVENTIONS } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import {
  activeSignalConfidence,
  readConfidenceBoolean,
  readConfidenceScore,
} from '@/services/mediatorEngine/priority/lib/confidence';
import { getLoad } from '@/services/mediatorEngine/priority/lib/safeState';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects exhaustion / emotional load signal. */
export const collectExhaustionSignal: PrioritySignalCollector = {
  type: 'exhaustion',
  collect(ctx) {
    const load = getLoad(ctx.input.state);
    const reflectionLoad = ctx.input.reflection?.loadRecommendation?.acknowledgeLoad === true;
    const exhausted = readConfidenceBoolean(load?.exhaustionDetected, false);
    const disengaged = readConfidenceBoolean(load?.disengagementRisk, false);

    if (!exhausted && !disengaged && !reflectionLoad) return null;

    const confidence = Math.max(
      readConfidenceScore(load?.exhaustionDetected, 0),
      readConfidenceScore(load?.disengagementRisk, 0),
      reflectionLoad ? 70 : 0
    );

    return {
      type: 'exhaustion',
      priority: PRIORITY_RANKS.exhaustion,
      confidence: activeSignalConfidence(confidence),
      reason: exhausted
        ? 'Emotional exhaustion detected'
        : disengaged
          ? 'Disengagement risk detected'
          : 'Reflection recommends acknowledging load',
      recommendedInterventionType: EXHAUSTION_INTERVENTIONS[0],
    };
  },
};
