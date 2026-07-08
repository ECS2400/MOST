import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

export interface GoalProgressionEvaluation {
  expectedGoalPath: TherapeuticGoal[];
  actualGoalPath: TherapeuticGoal[];
  matchedPrefixLength: number;
  completedExpectedGoals: TherapeuticGoal[];
  missingGoals: TherapeuticGoal[];
  unexpectedGoals: TherapeuticGoal[];
  exactMatch: boolean;
}
