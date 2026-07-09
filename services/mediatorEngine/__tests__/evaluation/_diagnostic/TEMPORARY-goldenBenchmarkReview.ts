/**
 * TEMPORARY — Golden Benchmark Review diagnostic (Phase 5I.16 review only).
 * NOT wired to production, npm scripts, or CI.
 *
 * Run:
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types services/mediatorEngine/__tests__/evaluation/_diagnostic/TEMPORARY-goldenBenchmarkReview.ts
 */

import { GOLDEN_CONVERSATIONS } from '@/services/mediatorEngine/__tests__/goldenConversations';
import { buildEvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle';
import { runGoldenBenchmark } from '@/services/mediatorEngine/evaluation/benchmark';
import { buildBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkReport';
import { formatBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkCli';
import { calculateEvaluationScore } from '@/services/mediatorEngine/evaluation/scoring';
import { extractActualGoalPath } from '@/services/mediatorEngine/evaluation/goalProgression/extractActualGoalPath';
import { extractActualStrategies } from '@/services/mediatorEngine/evaluation/strategy/extractActualStrategies';
import { extractActualInterventions } from '@/services/mediatorEngine/evaluation/intervention/extractActualInterventions';

const benchmarkResult = await runGoldenBenchmark([...GOLDEN_CONVERSATIONS]);
const report = buildBenchmarkReport(benchmarkResult);

const details = report.conversations.map((summary) => {
  const bundle = benchmarkResult.results.find((b) => b.conversationId === summary.conversationId)!;
  const conversation = GOLDEN_CONVERSATIONS.find((c) => c.id === summary.conversationId)!;
  const lastTurn = bundle.runResult.turns.at(-1);

  const perTurn = bundle.runResult.turns.map((turn) => ({
    turn: turn.turnNumber,
    speaker: turn.speaker,
    goal: turn.currentGoal,
    strategy: turn.strategy,
    intervention: turn.interventionType,
    transition: turn.goalTransition,
    safety: turn.safetyLevel,
    mediatorText: turn.finalMediatorMessage?.text?.slice(0, 200) ?? null,
  }));

  const score =
    bundle.status === 'PASS' ? calculateEvaluationScore(bundle) : null;

  return {
    id: summary.conversationId,
    title: summary.conversationTitle,
    tags: conversation.tags,
    difficulty: conversation.difficulty,
    safetyExpectation: conversation.safetyExpectation,
    status: summary.status,
    grade: summary.grade,
    overall: summary.overallScore,
    goalScore: summary.goalScore,
    strategyScore: summary.strategyScore,
    interventionScore: summary.interventionScore,
    safetyScore: summary.safetyScore,
    expectedReplayGoalPath: conversation.expectedReplayGoalPath ?? null,
    expectedFullGoalPath: conversation.expectedGoalPath,
    actualGoalPath: extractActualGoalPath(bundle.runResult),
    goalEvaluation: bundle.goalEvaluation,
    expectedReplayStrategies: conversation.expectedReplayStrategies ?? null,
    expectedFullStrategies: conversation.expectedStrategies,
    actualStrategies: extractActualStrategies(bundle.runResult),
    strategyEvaluation: bundle.strategyEvaluation,
    safetyEvaluation: bundle.safetyEvaluation,
    actualInterventions: extractActualInterventions(bundle.runResult),
    perTurnGoals: perTurn.map((t) => t.goal),
    perTurnStrategies: perTurn.map((t) => t.strategy),
    perTurnInterventions: perTurn.map((t) => t.intervention),
    perTurn,
    lastMediatorResponse: lastTurn?.finalMediatorMessage?.text ?? null,
    lastIntervention: lastTurn?.interventionType ?? null,
    score,
  };
});

const strategyFrequency: Record<string, number> = {};
const goalFrequency: Record<string, number> = {};
const interventionFrequency: Record<string, number> = {};

for (const item of details) {
  for (const s of item.actualStrategies) {
    strategyFrequency[s] = (strategyFrequency[s] ?? 0) + 1;
  }
  for (const g of item.actualGoalPath) {
    goalFrequency[g] = (goalFrequency[g] ?? 0) + 1;
  }
  for (const i of item.actualInterventions) {
    interventionFrequency[i] = (interventionFrequency[i] ?? 0) + 1;
  }
}

console.log('=== BENCHMARK FORMATTED ===');
console.log(formatBenchmarkReport(report));
console.log('\n=== DIAGNOSTIC JSON ===');
console.log(
  JSON.stringify(
    {
      summary: {
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        skipped: report.skipped,
        averages: {
          goal: report.averageGoalScore,
          strategy: report.averageStrategyScore,
          intervention: report.averageInterventionScore,
          safety: report.averageSafetyScore,
          overall: report.averageOverallScore,
        },
      },
      strategyFrequency,
      goalFrequency,
      interventionFrequency,
      details,
    },
    null,
    2
  )
);
