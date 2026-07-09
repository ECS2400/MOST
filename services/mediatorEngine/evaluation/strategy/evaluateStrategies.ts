import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import {
  dedupePreservingOrder,
  extractActualStrategies,
} from '@/services/mediatorEngine/evaluation/strategy/extractActualStrategies';
import type { StrategyEvaluation } from '@/services/mediatorEngine/evaluation/strategy/types';
import type { TherapeuticStrategy } from '@/types/mediator/engineTypes';

function strategiesAreEqual(
  left: TherapeuticStrategy[],
  right: TherapeuticStrategy[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((strategy, index) => strategy === right[index]);
}

function computeMatchedStrategies(
  expected: TherapeuticStrategy[],
  actual: TherapeuticStrategy[]
): TherapeuticStrategy[] {
  const actualSet = new Set(actual);
  const matched: TherapeuticStrategy[] = [];
  const seen = new Set<TherapeuticStrategy>();

  for (const strategy of expected) {
    if (actualSet.has(strategy) && !seen.has(strategy)) {
      matched.push(strategy);
      seen.add(strategy);
    }
  }

  return matched;
}

function computeMissingStrategies(
  expected: TherapeuticStrategy[],
  actual: TherapeuticStrategy[]
): TherapeuticStrategy[] {
  const actualSet = new Set(actual);

  return dedupePreservingOrder(expected).filter((strategy) => !actualSet.has(strategy));
}

function computeUnexpectedStrategies(
  expected: TherapeuticStrategy[],
  actual: TherapeuticStrategy[]
): TherapeuticStrategy[] {
  const expectedSet = new Set(dedupePreservingOrder(expected));

  return actual.filter((strategy) => !expectedSet.has(strategy));
}

function computeCoverage(
  expected: TherapeuticStrategy[],
  matched: TherapeuticStrategy[]
): number {
  if (expected.length === 0) {
    return 1;
  }

  return matched.length / expected.length;
}

export function evaluateStrategies(
  run: ConversationRunResult,
  conversation: GoldenConversation
): StrategyEvaluation {
  const expectedStrategies = [
    ...(conversation.expectedReplayStrategies ?? conversation.expectedStrategies),
  ];
  const actualStrategies = extractActualStrategies(run);
  const matchedStrategies = computeMatchedStrategies(expectedStrategies, actualStrategies);

  return {
    expectedStrategies,
    actualStrategies,
    matchedStrategies,
    missingStrategies: computeMissingStrategies(expectedStrategies, actualStrategies),
    unexpectedStrategies: computeUnexpectedStrategies(expectedStrategies, actualStrategies),
    coverage: computeCoverage(expectedStrategies, matchedStrategies),
    exactMatch: strategiesAreEqual(
      dedupePreservingOrder(expectedStrategies),
      actualStrategies
    ),
  };
}
