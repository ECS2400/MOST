import type { GoalTransition, SafetyOutput, TherapeuticGoal } from '@/types/mediator';

export type GoalCandidateKind = 'baseline' | 'skip' | 'regress' | 'fast_track';

export interface GoalCandidate {
  goal: TherapeuticGoal;
  kind: GoalCandidateKind;
}

export interface AdaptiveGoalSelectionInput {
  currentGoal: TherapeuticGoal;
  completedGoals: TherapeuticGoal[];
  mutualUnderstandingScore: number;
  completionDetected: boolean;
  goalStagnationDetected: boolean;
  safety: SafetyOutput | null | undefined;
  bothReady: boolean;
  acceptedByBoth: boolean;
  goalTransitionHistory: GoalTransition[];
  turnNumber: number;
}

export interface ScoredGoalCandidate {
  candidate: GoalCandidate;
  score: number;
}
