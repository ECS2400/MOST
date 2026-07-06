import type { ReflectionOutput, SessionMemory, TherapeuticGoal } from '@/types/mediator';
import { GOAL_STAGNATION_TURN_THRESHOLD } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';

export interface GoalStagnationDetection {
  activeGoalTurnCount: number;
  repeatedGoalDetected: boolean;
  repeatedGoalReason: string | null;
  goalStagnationDetected: boolean;
  goalStagnationReason: string | null;
}

function countTurnsOnGoal(memory: SessionMemory, goal: TherapeuticGoal): number {
  const history = Array.isArray(memory.interventionHistory) ? memory.interventionHistory : [];
  return history.filter((entry) => entry?.goal === goal).length;
}

function hasRepeatedInterventionsWithoutMovement(
  memory: SessionMemory,
  reflection: ReflectionOutput | null | undefined
): boolean {
  const recent = memory.recentInterventionTypes ?? [];
  if (recent.length < 3) return false;
  const first = recent[0];
  const allSame = recent.slice(0, 3).every((type) => type === first);
  const moved = reflection?.conversationMovedForward?.value;
  const lowConfidence = (reflection?.conversationMovedForward?.confidence ?? 100) < 50;
  return allSame && (moved === false || lowConfidence);
}

function noCompletedGoalsAfterTurns(
  turnNumber: number,
  completedCount: number
): boolean {
  return turnNumber >= GOAL_STAGNATION_TURN_THRESHOLD && completedCount === 0;
}

/** Detects when the active goal is stuck without progress. */
export function detectGoalStagnation(
  currentGoal: TherapeuticGoal,
  sessionMemory: SessionMemory,
  reflection: ReflectionOutput | null | undefined,
  turnNumber: number,
  completedGoals: readonly TherapeuticGoal[]
): GoalStagnationDetection {
  const activeGoalTurnCount = Math.max(
    countTurnsOnGoal(sessionMemory, currentGoal),
    turnNumber > 1 ? 1 : 0
  );

  const repeatedGoalDetected = activeGoalTurnCount >= GOAL_STAGNATION_TURN_THRESHOLD;
  const repeatedGoalReason = repeatedGoalDetected
    ? `${currentGoal} active for ${activeGoalTurnCount} turns`
    : null;

  const completedButStillCurrent = completedGoals.includes(currentGoal);
  const repeatedInterventions = hasRepeatedInterventionsWithoutMovement(sessionMemory, reflection);
  const noProgress = noCompletedGoalsAfterTurns(turnNumber, completedGoals.length);

  const goalStagnationDetected =
    repeatedGoalDetected ||
    completedButStillCurrent ||
    repeatedInterventions ||
    noProgress;

  let goalStagnationReason: string | null = null;
  if (completedButStillCurrent) {
    goalStagnationReason = 'Completed goal is still marked as current';
  } else if (repeatedInterventions) {
    goalStagnationReason = 'Repeated intervention types without forward movement';
  } else if (repeatedGoalDetected) {
    goalStagnationReason = repeatedGoalReason;
  } else if (noProgress) {
    goalStagnationReason = 'No completed goals after several turns';
  }

  return {
    activeGoalTurnCount,
    repeatedGoalDetected,
    repeatedGoalReason,
    goalStagnationDetected,
    goalStagnationReason,
  };
}
