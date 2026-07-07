import type { GoalContinuityTransition, SafetyOutput, TherapeuticGoal } from '@/types/mediator';
import {
  GOAL_FLOW_ORDER,
  nextGoalInFlow,
} from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { chooseAdaptiveNextGoal } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/chooseAdaptiveNextGoal';
import type { AdaptiveGoalSelectionInput } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';
import type { GoalCompletionDetection } from '@/services/mediatorEngine/goalContinuity/detectGoalCompletion';
import type { GoalStagnationDetection } from '@/services/mediatorEngine/goalContinuity/detectGoalStagnation';

export interface GoalContinuityRecommendation {
  recommendedGoalTransition: GoalContinuityTransition;
  recommendedNextGoal: TherapeuticGoal | null;
  suggestedStayReason: string | null;
  suggestedAdvanceReason: string | null;
}

function isSafetyActive(safety: SafetyOutput | null | undefined): boolean {
  if (!safety) return false;
  if (safety.preempted === true) return true;
  const level = safety.level;
  return level === 'L1_gentle' || level === 'L2_pause' || level === 'L3_stop';
}

function isClosureReady(
  currentGoal: TherapeuticGoal,
  completion: GoalCompletionDetection
): boolean {
  if (currentGoal === 'CLOSURE') return false;
  const next = nextGoalInFlow(currentGoal);
  return next === 'CLOSURE' && completion.completedGoals.includes('AGREEMENT');
}

function resolveRecommendedNextGoal(
  adaptiveInput: AdaptiveGoalSelectionInput | null | undefined,
  fallbackGoal: TherapeuticGoal | null
): TherapeuticGoal | null {
  if (!fallbackGoal) return null;
  return chooseAdaptiveNextGoal(adaptiveInput, fallbackGoal);
}

/** Chooses goal transition recommendation from completion and stagnation signals. */
export function chooseGoalContinuityRecommendation(
  currentGoal: TherapeuticGoal,
  completion: GoalCompletionDetection,
  stagnation: GoalStagnationDetection,
  safety: SafetyOutput | null | undefined,
  mutualUnderstandingScore: number,
  adaptiveInput?: AdaptiveGoalSelectionInput | null
): GoalContinuityRecommendation {
  if (isSafetyActive(safety)) {
    return {
      recommendedGoalTransition: 'stay',
      recommendedNextGoal: null,
      suggestedStayReason: 'Safety is active',
      suggestedAdvanceReason: null,
    };
  }

  const nextGoal = nextGoalInFlow(currentGoal);
  const completedButCurrent = completion.completedGoals.includes(currentGoal);

  if (completion.completionDetected || completedButCurrent) {
    if (nextGoal === 'CLOSURE' && isClosureReady(currentGoal, completion)) {
      return {
        recommendedGoalTransition: 'closure',
        recommendedNextGoal: resolveRecommendedNextGoal(adaptiveInput, 'CLOSURE'),
        suggestedStayReason: null,
        suggestedAdvanceReason: 'Agreement reached; prepare closure',
      };
    }
    if (nextGoal) {
      return {
        recommendedGoalTransition: 'advance',
        recommendedNextGoal: resolveRecommendedNextGoal(adaptiveInput, nextGoal),
        suggestedStayReason: null,
        suggestedAdvanceReason: completion.completionReason ?? `Move toward ${nextGoal}`,
      };
    }
  }

  if (stagnation.goalStagnationDetected && !completion.completionDetected) {
    if (mutualUnderstandingScore < 50 && currentGoal === 'PERSPECTIVE_SHARING') {
      return {
        recommendedGoalTransition: 'stay',
        recommendedNextGoal: null,
        suggestedStayReason: 'Mutual understanding is still low',
        suggestedAdvanceReason: null,
      };
    }
    if (stagnation.repeatedGoalDetected && nextGoal) {
      return {
        recommendedGoalTransition: 'advance',
        recommendedNextGoal: resolveRecommendedNextGoal(adaptiveInput, nextGoal),
        suggestedStayReason: null,
        suggestedAdvanceReason: 'Goal stagnation detected; try next stage',
      };
    }
  }

  if (currentGoal !== 'SAFE_OPENING' && mutualUnderstandingScore < 40) {
    const priorIndex = GOAL_FLOW_ORDER.indexOf(currentGoal);
    const priorGoal = priorIndex > 0 ? GOAL_FLOW_ORDER[priorIndex - 1] : null;
    if (priorGoal && stagnation.goalStagnationDetected) {
      return {
        recommendedGoalTransition: 'regress',
        recommendedNextGoal: resolveRecommendedNextGoal(adaptiveInput, priorGoal),
        suggestedStayReason: null,
        suggestedAdvanceReason: null,
      };
    }
  }

  return {
    recommendedGoalTransition: 'stay',
    recommendedNextGoal: null,
    suggestedStayReason: stagnation.goalStagnationReason ?? 'Continue current therapeutic stage',
    suggestedAdvanceReason: null,
  };
}
