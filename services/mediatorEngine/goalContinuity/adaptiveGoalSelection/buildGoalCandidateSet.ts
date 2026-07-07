import type { TherapeuticGoal } from '@/types/mediator';
import {
  GOAL_FLOW_ORDER,
  nextGoalInFlow,
} from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { ADAPTIVE_GOAL_RULES } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/config/adaptiveGoalRules';
import { isCandidateAllowed } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/goalTransitionGuards';
import type {
  AdaptiveGoalSelectionInput,
  GoalCandidate,
} from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';

function goalAtOffset(currentGoal: TherapeuticGoal, offset: number): TherapeuticGoal | null {
  const currentIndex = GOAL_FLOW_ORDER.indexOf(currentGoal);
  if (currentIndex < 0) return null;
  const targetIndex = currentIndex + offset;
  if (targetIndex < 0 || targetIndex >= GOAL_FLOW_ORDER.length) return null;
  return GOAL_FLOW_ORDER[targetIndex] ?? null;
}

function appendCandidate(
  candidates: GoalCandidate[],
  seen: Set<TherapeuticGoal>,
  candidate: GoalCandidate | null
): void {
  if (!candidate || seen.has(candidate.goal)) return;
  seen.add(candidate.goal);
  candidates.push(candidate);
}

/** Builds the deterministic candidate set for adaptive goal selection. */
export function buildGoalCandidateSet(input: AdaptiveGoalSelectionInput): GoalCandidate[] {
  const candidates: GoalCandidate[] = [];
  const seen = new Set<TherapeuticGoal>();
  const guardInput = {
    currentGoal: input.currentGoal,
    completedGoals: input.completedGoals,
    goalTransitionHistory: input.goalTransitionHistory,
    turnNumber: input.turnNumber,
  };

  const baselineGoal = nextGoalInFlow(input.currentGoal);
  if (baselineGoal) {
    appendCandidate(candidates, seen, { goal: baselineGoal, kind: 'baseline' });
  }

  const skipGoal = goalAtOffset(input.currentGoal, ADAPTIVE_GOAL_RULES.MAX_SKIP);
  appendCandidate(candidates, seen, skipGoal ? { goal: skipGoal, kind: 'skip' } : null);

  const regressGoal = goalAtOffset(input.currentGoal, -1);
  appendCandidate(candidates, seen, regressGoal ? { goal: regressGoal, kind: 'regress' } : null);

  const hasAgreementCompleted = input.completedGoals.includes('AGREEMENT');
  if (input.acceptedByBoth || hasAgreementCompleted) {
    appendCandidate(candidates, seen, { goal: 'FUTURE_PLAN', kind: 'fast_track' });
  }
  if (hasAgreementCompleted && input.completionDetected) {
    appendCandidate(candidates, seen, { goal: 'CLOSURE', kind: 'fast_track' });
  }

  return candidates.filter((candidate) => isCandidateAllowed(candidate, guardInput));
}
