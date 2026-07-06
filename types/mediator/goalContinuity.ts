/**
 * Goal continuity types for Mediator AI Engine v2.3.
 *
 * Role: structural goal-stage hints — no transcript or PII.
 */

import type { ExplainabilityGoalTransition } from './engineTypes';
import type { TherapeuticGoal } from './therapeuticGoal';

/** Recommended goal movement from Goal Continuity Engine. */
export type GoalContinuityTransition = ExplainabilityGoalTransition | 'closure';

/** Structural snapshot of goal progress across turns. */
export interface GoalContinuityContext {
  currentGoal: TherapeuticGoal;
  completedGoals: TherapeuticGoal[];
  recentlyCompletedGoals: TherapeuticGoal[];
  activeGoalTurnCount: number;
  repeatedGoalDetected: boolean;
  repeatedGoalReason: string | null;
  goalStagnationDetected: boolean;
  goalStagnationReason: string | null;
  completionDetected: boolean;
  completionReason: string | null;
  recommendedGoalTransition: GoalContinuityTransition;
  recommendedNextGoal: TherapeuticGoal | null;
  suggestedStayReason: string | null;
  suggestedAdvanceReason: string | null;
  goalContinuityHint: string | null;
  confidence: number;
}
