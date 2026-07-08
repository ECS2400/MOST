import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import { buildEvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import type { RunConversationEvaluationInput } from '@/services/mediatorEngine/evaluation/runner/types';
import { runGoldenConversation } from '@/services/mediatorEngine/evaluation/runGoldenConversation';
import type { InterventionType } from '@/types/mediator/engineTypes';

export async function runConversationEvaluation(
  conversation: GoldenConversation,
  expectedInterventions?: InterventionType[]
): Promise<EvaluationBundle>;
export async function runConversationEvaluation(
  input: RunConversationEvaluationInput
): Promise<EvaluationBundle>;
export async function runConversationEvaluation(
  conversationOrInput: GoldenConversation | RunConversationEvaluationInput,
  expectedInterventions?: InterventionType[]
): Promise<EvaluationBundle> {
  const conversation =
    'conversation' in conversationOrInput
      ? conversationOrInput.conversation
      : conversationOrInput;
  const resolvedExpectedInterventions =
    'conversation' in conversationOrInput
      ? conversationOrInput.expectedInterventions
      : expectedInterventions;

  const runResult = await runGoldenConversation(conversation);

  return buildEvaluationBundle(conversation, runResult, resolvedExpectedInterventions);
}
