import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import type { GoldenConversationSafetyExpectation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import { maxSafetyLevel } from '@/services/mediatorEngine/safety/config/safetyLevels';
import type { SafetyLevel } from '@/types/mediator';

export function runtimeSafetyToEvaluationLevel(
  level: SafetyLevel
): GoldenConversationSafetyExpectation {
  switch (level) {
    case 'L1_gentle':
      return 'L1';
    case 'L2_pause':
      return 'L2';
    case 'L3_stop':
      return 'L3';
    default:
      return 'none';
  }
}

export function extractObservedSafety(
  run: ConversationRunResult
): GoldenConversationSafetyExpectation {
  const levels = run.turns.map((turn) => turn.safetyLevel);
  const highestRuntimeLevel = maxSafetyLevel(levels);
  return runtimeSafetyToEvaluationLevel(highestRuntimeLevel);
}
