import type { GoalTransition, SafetyOutput, TherapeuticGoal } from '@/types/mediator';
import { GOAL_FLOW_ORDER } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { ADAPTIVE_GOAL_RULES } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/config/adaptiveGoalRules';
import type { GoalCandidate } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';

function asTransitionHistory(history: unknown): GoalTransition[] {
  return Array.isArray(history) ? history : [];
}

export function isSafetyBlocking(safety: SafetyOutput | null | undefined): boolean {
  if (!safety) return false;
  if (safety.preempted === true) return true;
  const level = safety.level;
  return level === 'L1_gentle' || level === 'L2_pause' || level === 'L3_stop';
}

export function wasRecentRegress(
  history: readonly GoalTransition[] | unknown,
  turnNumber: number
): boolean {
  return asTransitionHistory(history).some(
    (entry) =>
      entry?.direction === 'regress' &&
      typeof entry.turnNumber === 'number' &&
      turnNumber - entry.turnNumber <= ADAPTIVE_GOAL_RULES.REGRESS_COOLDOWN_TURNS
  );
}

export function isCompletedGoal(
  goal: TherapeuticGoal,
  completedGoals: readonly TherapeuticGoal[]
): boolean {
  return completedGoals.includes(goal);
}

export function hasPingPongPattern(history: readonly GoalTransition[] | unknown): boolean {
  const transitions = asTransitionHistory(history);
  if (transitions.length < 2) return false;
  const last = transitions.at(-1);
  const previous = transitions.at(-2);
  if (!last || !previous) return false;
  return (
    (last.direction === 'advance' && previous.direction === 'regress') ||
    (last.direction === 'regress' && previous.direction === 'advance')
  );
}

export function skipDistance(currentGoal: TherapeuticGoal, targetGoal: TherapeuticGoal): number | null {
  const currentIndex = GOAL_FLOW_ORDER.indexOf(currentGoal);
  const targetIndex = GOAL_FLOW_ORDER.indexOf(targetGoal);
  if (currentIndex < 0 || targetIndex < 0) return null;
  return targetIndex - currentIndex;
}

export function isCandidateAllowed(
  candidate: GoalCandidate,
  input: {
    currentGoal: TherapeuticGoal;
    completedGoals: TherapeuticGoal[];
    goalTransitionHistory: GoalTransition[] | unknown;
    turnNumber: number;
  }
): boolean {
  if (candidate.kind === 'regress' && isCompletedGoal(candidate.goal, input.completedGoals)) {
    return false;
  }

  if (candidate.kind === 'skip') {
    const distance = skipDistance(input.currentGoal, candidate.goal);
    if (distance === null || distance <= 0 || distance > ADAPTIVE_GOAL_RULES.MAX_SKIP) {
      return false;
    }
  }

  if (
    candidate.kind !== 'baseline' &&
    candidate.kind !== 'regress' &&
    wasRecentRegress(input.goalTransitionHistory, input.turnNumber)
  ) {
    return false;
  }

  if (candidate.kind !== 'baseline' && hasPingPongPattern(input.goalTransitionHistory)) {
    return false;
  }

  return true;
}
