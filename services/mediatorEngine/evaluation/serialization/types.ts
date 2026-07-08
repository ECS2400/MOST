import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { InterventionEvaluation } from '@/services/mediatorEngine/evaluation/intervention/types';
import type { EvaluationScore } from '@/services/mediatorEngine/evaluation/scoring/types';
import type { SafetyEvaluation } from '@/services/mediatorEngine/evaluation/safety/types';
import type { StrategyEvaluation } from '@/services/mediatorEngine/evaluation/strategy/types';
import type { ConversationRunStatus } from '@/services/mediatorEngine/evaluation/types';

export interface SerializedEvaluationMetadata {
  version: '1';
  generatedAt: string;
}

export interface SerializedEvaluationConversation {
  id: string;
  title: string;
  status: ConversationRunStatus;
}

export interface SerializedEvaluationRun {
  executedTurns: number;
  status: ConversationRunStatus;
}

export interface SerializedEvaluation {
  metadata: SerializedEvaluationMetadata;
  conversation: SerializedEvaluationConversation;
  run: SerializedEvaluationRun;
  goal: GoalProgressionEvaluation;
  strategy: StrategyEvaluation;
  intervention: InterventionEvaluation | null;
  safety: SafetyEvaluation;
  score: EvaluationScore | null;
}
