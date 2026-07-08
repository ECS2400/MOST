import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { InterventionType } from '@/types/mediator/engineTypes';

export interface RunConversationEvaluationInput {
  conversation: GoldenConversation;
  expectedInterventions?: InterventionType[];
}
