import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import { evaluateGoalProgression } from '@/services/mediatorEngine/evaluation/goalProgression';
import type { BuildEvaluationBundleInput, EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { evaluateInterventions } from '@/services/mediatorEngine/evaluation/intervention';
import { evaluateSafety } from '@/services/mediatorEngine/evaluation/safety';
import { evaluateStrategies } from '@/services/mediatorEngine/evaluation/strategy';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import type { InterventionType } from '@/types/mediator/engineTypes';

export function buildEvaluationBundle(
  conversation: GoldenConversation,
  run: ConversationRunResult,
  expectedInterventions?: InterventionType[]
): EvaluationBundle;
export function buildEvaluationBundle(input: BuildEvaluationBundleInput): EvaluationBundle;
export function buildEvaluationBundle(
  conversationOrInput: GoldenConversation | BuildEvaluationBundleInput,
  run?: ConversationRunResult,
  expectedInterventions?: InterventionType[]
): EvaluationBundle {
  const conversation =
    'conversation' in conversationOrInput
      ? conversationOrInput.conversation
      : conversationOrInput;
  const resolvedRun =
    'conversation' in conversationOrInput ? conversationOrInput.run : run!;
  const resolvedExpectedInterventions =
    'conversation' in conversationOrInput
      ? conversationOrInput.expectedInterventions
      : expectedInterventions;

  const goalEvaluation = evaluateGoalProgression(resolvedRun, conversation);
  const strategyEvaluation = evaluateStrategies(resolvedRun, conversation);
  const safetyEvaluation = evaluateSafety(resolvedRun, conversation);
  const interventionEvaluation =
    resolvedExpectedInterventions !== undefined
      ? evaluateInterventions(resolvedRun, resolvedExpectedInterventions)
      : undefined;

  return {
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    status: resolvedRun.status,
    runResult: resolvedRun,
    goalEvaluation,
    strategyEvaluation,
    interventionEvaluation,
    safetyEvaluation,
  };
}
