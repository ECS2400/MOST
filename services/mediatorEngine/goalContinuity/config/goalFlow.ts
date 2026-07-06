import type { TherapeuticGoal } from '@/types/mediator';

/** Deterministic therapeutic goal order using existing taxonomy names. */
export const GOAL_FLOW_ORDER: readonly TherapeuticGoal[] = [
  'SAFE_OPENING',
  'EMOTION_NAMING',
  'EMOTION_UNDERSTANDING',
  'NEED_NAMING',
  'PERSPECTIVE_SHARING',
  'REFRAME',
  'AGREEMENT',
  'FUTURE_PLAN',
  'CLOSURE',
] as const;

/** Turns on the same goal before stagnation is flagged. */
export const GOAL_STAGNATION_TURN_THRESHOLD = 5;

/** Mutual understanding score (0–100) to treat PERSPECTIVE_SHARING as complete. */
export const MUTUAL_UNDERSTANDING_COMPLETE_THRESHOLD = 70;

/** Agreement level (0–100) supporting perspective-sharing completion. */
export const AGREEMENT_LEVEL_COMPLETE_THRESHOLD = 70;

/** Returns the next goal in the flow, or null at CLOSURE. */
export function nextGoalInFlow(current: TherapeuticGoal): TherapeuticGoal | null {
  const index = GOAL_FLOW_ORDER.indexOf(current);
  if (index < 0 || index >= GOAL_FLOW_ORDER.length - 1) return null;
  return GOAL_FLOW_ORDER[index + 1] ?? null;
}

/** Deduplicates goals while preserving order. */
export function dedupeGoals(goals: readonly TherapeuticGoal[]): TherapeuticGoal[] {
  const seen = new Set<TherapeuticGoal>();
  const result: TherapeuticGoal[] = [];
  for (const goal of goals) {
    if (!seen.has(goal)) {
      seen.add(goal);
      result.push(goal);
    }
  }
  return result;
}
