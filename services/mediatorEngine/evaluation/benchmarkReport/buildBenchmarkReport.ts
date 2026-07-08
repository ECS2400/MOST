import type { BenchmarkResult } from '@/services/mediatorEngine/evaluation/benchmark/types';
import type {
  BenchmarkConversationReport,
  BenchmarkReport,
} from '@/services/mediatorEngine/evaluation/benchmarkReport/types';
import { calculateEvaluationScore } from '@/services/mediatorEngine/evaluation/scoring';

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildBenchmarkReport(result: BenchmarkResult): BenchmarkReport {
  const conversations: BenchmarkConversationReport[] = result.results.map((bundle) => {
    if (bundle.status !== 'PASS') {
      return {
        conversationId: bundle.conversationId,
        conversationTitle: bundle.conversationTitle,
        status: bundle.status,
        goalScore: null,
        strategyScore: null,
        interventionScore: null,
        safetyScore: null,
        overallScore: null,
        grade: null,
        skipReason: bundle.runResult.skipReason,
        failureReason: bundle.runResult.failureReason,
      };
    }

    const score = calculateEvaluationScore(bundle);

    return {
      conversationId: bundle.conversationId,
      conversationTitle: bundle.conversationTitle,
      status: bundle.status,
      goalScore: score.goalScore,
      strategyScore: score.strategyScore,
      interventionScore: score.interventionScore,
      safetyScore: score.safetyScore,
      overallScore: score.overallScore,
      grade: score.grade,
    };
  });

  const rankedConversations = conversations
    .filter((conversation) => conversation.status === 'PASS')
    .sort((left, right) => (right.overallScore ?? 0) - (left.overallScore ?? 0));
  const skippedConversations = conversations.filter((conversation) => conversation.status === 'SKIPPED');
  const failedConversations = conversations.filter((conversation) => conversation.status === 'FAILED');

  return {
    total: result.total,
    passed: result.passed,
    failed: result.failed,
    skipped: result.skipped,
    averageGoalScore: average(rankedConversations.map((conversation) => conversation.goalScore ?? 0)),
    averageStrategyScore: average(
      rankedConversations.map((conversation) => conversation.strategyScore ?? 0)
    ),
    averageInterventionScore: average(
      rankedConversations.map((conversation) => conversation.interventionScore ?? 0)
    ),
    averageSafetyScore: average(rankedConversations.map((conversation) => conversation.safetyScore ?? 0)),
    averageOverallScore: average(rankedConversations.map((conversation) => conversation.overallScore ?? 0)),
    conversations,
    skippedConversations,
    failedConversations,
    rankedConversations,
  };
}
