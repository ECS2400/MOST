import type { InterventionType } from '@/types/mediator/engineTypes';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { InterventionEvaluation } from '@/services/mediatorEngine/evaluation/intervention/types';
import type { SafetyEvaluation } from '@/services/mediatorEngine/evaluation/safety/types';
import type { StrategyEvaluation } from '@/services/mediatorEngine/evaluation/strategy/types';
import type {
  ConversationRunResult,
  ConversationRunStatus,
} from '@/services/mediatorEngine/evaluation/types';

export interface EvaluationBundle {
  conversationId: string;
  conversationTitle: string;
  status: ConversationRunStatus;
  runResult: ConversationRunResult;
  goalEvaluation: GoalProgressionEvaluation;
  strategyEvaluation: StrategyEvaluation;
  interventionEvaluation?: InterventionEvaluation;
  safetyEvaluation: SafetyEvaluation;
}

export interface BuildEvaluationBundleInput {
  conversation: GoldenConversation;
  run: ConversationRunResult;
  expectedInterventions?: InterventionType[];
}
