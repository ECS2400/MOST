import { ESCALATION_INTERVENTIONS } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import {
  ESCALATION_LEVEL_THRESHOLD,
  PRIORITY_RANKS,
} from '@/services/mediatorEngine/priority/config/priorityRanks';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import {
  getEscalationLevel,
  isEscalationDetected,
} from '@/services/mediatorEngine/priority/lib/safeState';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects escalation signal from conversation dynamics. */
export const collectEscalationSignal: PrioritySignalCollector = {
  type: 'escalation',
  collect(ctx) {
    const { state, reflection } = ctx.input;
    const level = getEscalationLevel(state);
    const detected = isEscalationDetected(state) || level >= ESCALATION_LEVEL_THRESHOLD;
    const stuckRisk = reflection?.stuckRisk?.value === true;

    if (!detected && !stuckRisk) return null;

    const confidence = Math.max(
      detected ? 70 + Math.min(level * 10, 25) : 0,
      reflection?.stuckRisk?.confidence ?? 0
    );

    return {
      type: 'escalation',
      priority: PRIORITY_RANKS.escalation,
      confidence: activeSignalConfidence(confidence),
      reason: detected
        ? `Escalation detected (level ${level})`
        : 'Reflection reports stuck conversation risk',
      recommendedInterventionType: ESCALATION_INTERVENTIONS[0],
    };
  },
};
