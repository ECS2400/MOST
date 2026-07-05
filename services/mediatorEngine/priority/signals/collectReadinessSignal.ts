import { PRIORITY_RANKS, READINESS_CONFIDENCE_THRESHOLD } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { primaryInterventionForStrategy } from '@/services/mediatorEngine/priority/config/strategyInterventions';
import {
  activeSignalConfidence,
  readConfidenceBoolean,
  readConfidenceScore,
} from '@/services/mediatorEngine/priority/lib/confidence';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Collects readiness / progress signal from Reflection output. */
export const collectReadinessSignal: PrioritySignalCollector = {
  type: 'readiness',
  collect(ctx) {
    const { reflection, strategy } = ctx.input;
    if (!reflection) return null;

    const hostReady = readConfidenceBoolean(reflection.partnerReadiness?.host?.readyToAdvance, false);
    const partnerReady = readConfidenceBoolean(
      reflection.partnerReadiness?.partner?.readyToAdvance,
      false
    );
    const movedForward = readConfidenceBoolean(reflection.conversationMovedForward, false);
    const hostConfidence = readConfidenceScore(reflection.partnerReadiness?.host?.readyToAdvance, 0);
    const partnerConfidence = readConfidenceScore(
      reflection.partnerReadiness?.partner?.readyToAdvance,
      0
    );
    const progressConfidence = Math.max(hostConfidence, partnerConfidence);

    const ready =
      (hostReady && partnerReady && progressConfidence >= READINESS_CONFIDENCE_THRESHOLD) ||
      (movedForward && readConfidenceScore(reflection.conversationMovedForward, 0) >= READINESS_CONFIDENCE_THRESHOLD);

    if (!ready) return null;

    return {
      type: 'readiness',
      priority: PRIORITY_RANKS.readiness,
      confidence: activeSignalConfidence(Math.max(progressConfidence, 70)),
      reason: hostReady && partnerReady
        ? 'Both partners ready to advance'
        : 'Conversation moved forward with confidence',
      recommendedInterventionType: primaryInterventionForStrategy(strategy.primaryStrategy),
    };
  },
};
