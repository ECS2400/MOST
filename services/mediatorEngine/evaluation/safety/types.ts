import type { GoldenConversationSafetyExpectation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export type { GoldenConversationSafetyExpectation as EvaluationSafetyLevel };

export interface SafetyEvaluation {
  expectedSafety: GoldenConversationSafetyExpectation;
  observedSafety: GoldenConversationSafetyExpectation;
  exactMatch: boolean;
  isSaferThanExpected: boolean;
  isLessSafeThanExpected: boolean;
}
