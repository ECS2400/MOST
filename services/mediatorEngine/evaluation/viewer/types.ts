import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';

export interface FormatConversationTraceInput {
  conversation: GoldenConversation;
  run: ConversationRunResult;
  goalEvaluation?: GoalProgressionEvaluation;
}
