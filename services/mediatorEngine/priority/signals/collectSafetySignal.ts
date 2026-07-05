import { SAFETY_INTERVENTIONS } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { activeSignalConfidence, readConfidenceScore } from '@/services/mediatorEngine/priority/lib/confidence';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects safety preemption signal from Human Safety Layer output. */
export const collectSafetySignal: PrioritySignalCollector = {
  type: 'safety',
  collect(ctx) {
    const safety = ctx.input.safety;
    if (!safety) return null;

    const active =
      safety.preempted ||
      safety.level !== 'none' ||
      safety.signals.length > 0 ||
      safety.assessed?.value === true;

    if (!active) return null;

    const confidence = Math.max(
      readConfidenceScore(safety.assessed, 80),
      ...safety.signals.map((signal) => signal.confidence),
      safety.level === 'L3_stop' ? 95 : safety.level === 'L2_pause' ? 85 : 70
    );

    const recommended =
      safety.recommendedInterventionType &&
      (SAFETY_INTERVENTIONS as readonly string[]).includes(safety.recommendedInterventionType)
        ? safety.recommendedInterventionType
        : 'safety_response';

    return {
      type: 'safety',
      priority: PRIORITY_RANKS.safety,
      confidence: activeSignalConfidence(confidence, safety.signals.map((s) => s.quote)),
      reason: safety.preempted
        ? 'Safety layer preempted standard pipeline'
        : `Safety level ${safety.level}`,
      recommendedInterventionType: recommended,
    };
  },
};
