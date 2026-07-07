import type {
  GoalContinuityContext,
  GoalState,
  GoalTransition,
  MediationState,
  SessionMemory,
  SessionMemoryUpdateInput,
  TherapeuticGoal,
} from '@/types/mediator';
import {
  GOAL_FLOW_ORDER,
  dedupeGoals,
  nextGoalInFlow,
} from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import { appendLimited } from '@/services/mediatorEngine/memory/lib/listHelpers';

function asGoalStates(state: MediationState): GoalState[] {
  return Array.isArray(state?.goals) ? state.goals : [];
}

function completedGoalsFromState(state: MediationState): TherapeuticGoal[] {
  return asGoalStates(state)
    .filter((goalState) => goalState?.status === 'completed' && typeof goalState.goal === 'string')
    .map((goalState) => goalState.goal);
}

function priorGoalInFlow(current: TherapeuticGoal): TherapeuticGoal | null {
  const index = GOAL_FLOW_ORDER.indexOf(current);
  if (index <= 0) return null;
  return GOAL_FLOW_ORDER[index - 1] ?? null;
}

function resolveGoalTransitionReason(
  goalContinuityContext: GoalContinuityContext | null | undefined
): string | null {
  if (!goalContinuityContext) return null;
  if (goalContinuityContext.completionReason) return goalContinuityContext.completionReason;
  if (goalContinuityContext.suggestedAdvanceReason) {
    return goalContinuityContext.suggestedAdvanceReason;
  }
  if (goalContinuityContext.suggestedStayReason) return goalContinuityContext.suggestedStayReason;
  return null;
}

function mergeCompletedGoals(
  memory: SessionMemory,
  state: MediationState,
  goalContinuityContext: GoalContinuityContext | null | undefined
): TherapeuticGoal[] {
  const fromState = completedGoalsFromState(state);
  const fromContinuity = goalContinuityContext?.completedGoals ?? memory.completedGoals;
  return dedupeGoals([...fromState, ...fromContinuity]);
}

function resolveTransitionTargetGoal(
  goalContinuityContext: GoalContinuityContext,
  direction: 'advance' | 'regress'
): TherapeuticGoal | null {
  if (goalContinuityContext.recommendedNextGoal) {
    return goalContinuityContext.recommendedNextGoal;
  }
  if (direction === 'advance') {
    return nextGoalInFlow(goalContinuityContext.currentGoal);
  }
  return priorGoalInFlow(goalContinuityContext.currentGoal);
}

function resolveTransitionTimestamp(input: SessionMemoryUpdateInput): string {
  const lastUpdatedAt = input.state?.meta?.lastUpdatedAt;
  if (typeof lastUpdatedAt === 'string' && lastUpdatedAt.length > 0) {
    return lastUpdatedAt;
  }

  const validatedAt = input.complianceResult?.validatedAt;
  if (typeof validatedAt === 'string' && validatedAt.length > 0) {
    return validatedAt;
  }

  const generatedAt = input.intervention?.generatedAt;
  if (typeof generatedAt === 'string' && generatedAt.length > 0) {
    return generatedAt;
  }

  return new Date().toISOString();
}

function buildAppliedGoalTransition(input: SessionMemoryUpdateInput): GoalTransition | null {
  const { goalTransition, goalContinuityContext, turnNumber } = input;
  if (!goalTransition || goalTransition === 'stay' || !goalContinuityContext) {
    return null;
  }

  const toGoal = resolveTransitionTargetGoal(goalContinuityContext, goalTransition);
  if (!toGoal) return null;

  const reason =
    resolveGoalTransitionReason(goalContinuityContext) ?? `Goal transition: ${goalTransition}`;

  return {
    fromGoal: goalContinuityContext.currentGoal,
    toGoal,
    direction: goalTransition,
    turnNumber,
    timestamp: resolveTransitionTimestamp(input),
    reason,
    triggeredBy: 'decision_engine',
  };
}

function appendGoalTransitionHistory(
  history: readonly GoalTransition[],
  transition: GoalTransition
): GoalTransition[] {
  const duplicate = history.some(
    (existing) =>
      existing.turnNumber === transition.turnNumber &&
      existing.fromGoal === transition.fromGoal &&
      existing.toGoal === transition.toGoal &&
      existing.direction === transition.direction
  );
  if (duplicate) return [...history];
  return appendLimited(history, transition, SESSION_MEMORY_LIMITS.maxGoalTransitionHistory);
}

/** Persists goal progress and applied goal transitions across turns. */
export function collectGoalProgressMemory(
  memory: SessionMemory,
  input: SessionMemoryUpdateInput
): SessionMemory {
  const completedGoals = mergeCompletedGoals(memory, input.state, input.goalContinuityContext);
  const appliedTransition = buildAppliedGoalTransition(input);

  if (!appliedTransition) {
    return {
      ...memory,
      completedGoals,
    };
  }

  return {
    ...memory,
    completedGoals,
    goalTransitionHistory: appendGoalTransitionHistory(
      memory.goalTransitionHistory,
      appliedTransition
    ),
    lastGoalTransitionReason: resolveGoalTransitionReason(input.goalContinuityContext),
  };
}
