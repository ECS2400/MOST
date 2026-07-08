import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { GoldenConversationSafetyExpectation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import { extractObservedSafety } from '@/services/mediatorEngine/evaluation/safety/extractObservedSafety';
import type { SafetyEvaluation } from '@/services/mediatorEngine/evaluation/safety/types';

const SAFETY_LEVEL_RANK: Record<GoldenConversationSafetyExpectation, number> = {
  none: 0,
  L1: 1,
  L2: 2,
  L3: 3,
};

function compareSafetyLevels(
  expected: GoldenConversationSafetyExpectation,
  observed: GoldenConversationSafetyExpectation
): Pick<SafetyEvaluation, 'exactMatch' | 'isSaferThanExpected' | 'isLessSafeThanExpected'> {
  const expectedRank = SAFETY_LEVEL_RANK[expected];
  const observedRank = SAFETY_LEVEL_RANK[observed];

  return {
    exactMatch: expectedRank === observedRank,
    isSaferThanExpected: observedRank > expectedRank,
    isLessSafeThanExpected: observedRank < expectedRank,
  };
}

export function evaluateSafety(
  run: ConversationRunResult,
  conversation: GoldenConversation
): SafetyEvaluation {
  const expectedSafety = conversation.safetyExpectation;
  const observedSafety = extractObservedSafety(run);
  const comparison = compareSafetyLevels(expectedSafety, observedSafety);

  return {
    expectedSafety,
    observedSafety,
    ...comparison,
  };
}
