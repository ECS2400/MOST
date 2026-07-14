import { PRIORITY_RANKS } from '@/services/mediatorEngine/priority/config/priorityRanks';
import { hasRecentMediatorCriticism } from '@/services/mediatorEngine/priority/lib/detectMediatorCriticism';
import { activeSignalConfidence } from '@/services/mediatorEngine/priority/lib/confidence';
import type { PrioritySignalCollector } from '@/services/mediatorEngine/priority/signals/types';

/** Activates repair_voice when participants criticize Mościk or the app. */
export const collectRepairVoiceSignal: PrioritySignalCollector = {
  type: 'repair_voice',
  collect(ctx) {
    if (ctx.input.safety?.level === 'L2_pause' || ctx.input.safety?.level === 'L3_stop') {
      return null;
    }

    const delta = [
      ...(ctx.input.transcriptWindow ?? []),
      ...(ctx.input.transcriptDelta ?? []),
    ];
    if (!hasRecentMediatorCriticism(delta)) {
      return null;
    }

    return {
      type: 'repair_voice',
      priority: PRIORITY_RANKS.repair_voice,
      confidence: activeSignalConfidence(85),
      reason: 'Participant criticized mediator repetition or the app',
      recommendedInterventionType: 'recover_acknowledge',
    };
  },
};
