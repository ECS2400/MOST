import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import { extractActualGoalPath } from '@/services/mediatorEngine/evaluation/goalProgression/extractActualGoalPath';
import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

function goalsAreEqual(left: TherapeuticGoal[], right: TherapeuticGoal[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((goal, index) => goal === right[index]);
}

function computeMatchedPrefixLength(
  expected: TherapeuticGoal[],
  actual: TherapeuticGoal[]
): number {
  const limit = Math.min(expected.length, actual.length);
  let length = 0;

  while (length < limit && expected[length] === actual[length]) {
    length += 1;
  }

  return length;
}

function computeCompletedExpectedGoals(
  expected: TherapeuticGoal[],
  actual: TherapeuticGoal[]
): TherapeuticGoal[] {
  const completed: TherapeuticGoal[] = [];
  let searchFrom = 0;

  for (const goal of expected) {
    const foundAt = actual.indexOf(goal, searchFrom);
    if (foundAt === -1) {
      continue;
    }

    completed.push(goal);
    searchFrom = foundAt + 1;
  }

  return completed;
}

function computeMissingGoals(
  expected: TherapeuticGoal[],
  actual: TherapeuticGoal[]
): TherapeuticGoal[] {
  const actualSet = new Set(actual);
  return expected.filter((goal) => !actualSet.has(goal));
}

function computeUnexpectedGoals(
  expected: TherapeuticGoal[],
  actual: TherapeuticGoal[]
): TherapeuticGoal[] {
  const expectedSet = new Set(expected);
  const unexpected: TherapeuticGoal[] = [];
  const seen = new Set<TherapeuticGoal>();

  for (const goal of actual) {
    if (!expectedSet.has(goal) && !seen.has(goal)) {
      unexpected.push(goal);
      seen.add(goal);
    }
  }

  return unexpected;
}

export function evaluateGoalProgression(
  run: ConversationRunResult,
  conversation: GoldenConversation
): GoalProgressionEvaluation {
  const expectedGoalPath = [...conversation.expectedGoalPath];
  const actualGoalPath = extractActualGoalPath(run);

  return {
    expectedGoalPath,
    actualGoalPath,
    matchedPrefixLength: computeMatchedPrefixLength(expectedGoalPath, actualGoalPath),
    completedExpectedGoals: computeCompletedExpectedGoals(expectedGoalPath, actualGoalPath),
    missingGoals: computeMissingGoals(expectedGoalPath, actualGoalPath),
    unexpectedGoals: computeUnexpectedGoals(expectedGoalPath, actualGoalPath),
    exactMatch: goalsAreEqual(expectedGoalPath, actualGoalPath),
  };
}
