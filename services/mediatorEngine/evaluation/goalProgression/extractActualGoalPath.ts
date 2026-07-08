import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

export function collapseConsecutiveGoals(goals: TherapeuticGoal[]): TherapeuticGoal[] {
  const collapsed: TherapeuticGoal[] = [];

  for (const goal of goals) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== goal) {
      collapsed.push(goal);
    }
  }

  return collapsed;
}

export function extractActualGoalPath(run: ConversationRunResult): TherapeuticGoal[] {
  const rawGoals = run.turns.map((turn) => turn.currentGoal);
  return collapseConsecutiveGoals(rawGoals);
}
