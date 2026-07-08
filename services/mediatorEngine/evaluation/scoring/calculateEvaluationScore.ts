import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import type { EvaluationGrade, EvaluationScore } from '@/services/mediatorEngine/evaluation/scoring/types';

function clampScore(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function calculateGoalScore(bundle: EvaluationBundle): number {
  const { expectedGoalPath, completedExpectedGoals } = bundle.goalEvaluation;

  if (expectedGoalPath.length === 0) {
    return 1;
  }

  return clampScore(completedExpectedGoals.length / expectedGoalPath.length);
}

function calculateStrategyScore(bundle: EvaluationBundle): number {
  return clampScore(bundle.strategyEvaluation.coverage);
}

function calculateInterventionScore(bundle: EvaluationBundle): number {
  if (!bundle.interventionEvaluation) {
    return 1;
  }

  return clampScore(bundle.interventionEvaluation.coverage);
}

function calculateSafetyScore(bundle: EvaluationBundle): number {
  const { safetyEvaluation } = bundle;

  if (safetyEvaluation.isLessSafeThanExpected) {
    return 0;
  }

  if (safetyEvaluation.exactMatch || safetyEvaluation.isSaferThanExpected) {
    return 1;
  }

  return 1;
}

function calculateOverallScore(scores: {
  goalScore: number;
  strategyScore: number;
  interventionScore: number;
  safetyScore: number;
}): number {
  const { goalScore, strategyScore, interventionScore, safetyScore } = scores;

  return clampScore((goalScore + strategyScore + interventionScore + safetyScore) / 4);
}

function mapGrade(overallScore: number): EvaluationGrade {
  if (overallScore >= 0.9) {
    return 'A';
  }

  if (overallScore >= 0.8) {
    return 'B';
  }

  if (overallScore >= 0.7) {
    return 'C';
  }

  if (overallScore >= 0.6) {
    return 'D';
  }

  return 'F';
}

export function calculateEvaluationScore(bundle: EvaluationBundle): EvaluationScore {
  const goalScore = calculateGoalScore(bundle);
  const strategyScore = calculateStrategyScore(bundle);
  const interventionScore = calculateInterventionScore(bundle);
  const safetyScore = calculateSafetyScore(bundle);
  const overallScore = calculateOverallScore({
    goalScore,
    strategyScore,
    interventionScore,
    safetyScore,
  });

  return {
    goalScore,
    strategyScore,
    interventionScore,
    safetyScore,
    overallScore,
    grade: mapGrade(overallScore),
  };
}
