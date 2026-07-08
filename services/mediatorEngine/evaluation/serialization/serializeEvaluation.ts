import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import type { EvaluationScore } from '@/services/mediatorEngine/evaluation/scoring/types';
import type { SerializedEvaluation } from '@/services/mediatorEngine/evaluation/serialization/types';

export function serializeEvaluation(
  bundle: EvaluationBundle,
  score?: EvaluationScore
): SerializedEvaluation {
  return {
    metadata: {
      version: '1',
      generatedAt: new Date().toISOString(),
    },
    conversation: {
      id: bundle.conversationId,
      title: bundle.conversationTitle,
      status: bundle.status,
    },
    run: {
      executedTurns: bundle.runResult.executedTurns,
      status: bundle.runResult.status,
    },
    goal: { ...bundle.goalEvaluation },
    strategy: { ...bundle.strategyEvaluation },
    intervention: bundle.interventionEvaluation
      ? { ...bundle.interventionEvaluation }
      : null,
    safety: { ...bundle.safetyEvaluation },
    score: score ?? null,
  };
}
