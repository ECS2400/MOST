import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import {
  dedupePreservingOrder,
  extractActualInterventions,
} from '@/services/mediatorEngine/evaluation/intervention/extractActualInterventions';
import type { InterventionEvaluation } from '@/services/mediatorEngine/evaluation/intervention/types';
import type { InterventionType } from '@/types/mediator/engineTypes';

function interventionsAreEqual(
  left: InterventionType[],
  right: InterventionType[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((intervention, index) => intervention === right[index]);
}

function computeMatchedInterventions(
  expected: InterventionType[],
  actual: InterventionType[]
): InterventionType[] {
  const actualSet = new Set(actual);
  const matched: InterventionType[] = [];
  const seen = new Set<InterventionType>();

  for (const intervention of expected) {
    if (actualSet.has(intervention) && !seen.has(intervention)) {
      matched.push(intervention);
      seen.add(intervention);
    }
  }

  return matched;
}

function computeMissingInterventions(
  expected: InterventionType[],
  actual: InterventionType[]
): InterventionType[] {
  const actualSet = new Set(actual);

  return dedupePreservingOrder(expected).filter((intervention) => !actualSet.has(intervention));
}

function computeUnexpectedInterventions(
  expected: InterventionType[],
  actual: InterventionType[]
): InterventionType[] {
  const expectedSet = new Set(dedupePreservingOrder(expected));

  return actual.filter((intervention) => !expectedSet.has(intervention));
}

function computeCoverage(
  expected: InterventionType[],
  matched: InterventionType[]
): number {
  if (expected.length === 0) {
    return 1;
  }

  return matched.length / expected.length;
}

export function evaluateInterventions(
  run: ConversationRunResult,
  expectedInterventions: InterventionType[]
): InterventionEvaluation {
  const expected = [...expectedInterventions];
  const actualInterventions = extractActualInterventions(run);
  const matchedInterventions = computeMatchedInterventions(expected, actualInterventions);

  return {
    expectedInterventions: expected,
    actualInterventions,
    matchedInterventions,
    missingInterventions: computeMissingInterventions(expected, actualInterventions),
    unexpectedInterventions: computeUnexpectedInterventions(expected, actualInterventions),
    coverage: computeCoverage(expected, matchedInterventions),
    exactMatch: interventionsAreEqual(dedupePreservingOrder(expected), actualInterventions),
  };
}
