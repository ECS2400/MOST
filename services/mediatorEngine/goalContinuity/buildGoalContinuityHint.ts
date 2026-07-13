import type { GoalContinuityContext } from '@/types/mediator/goalContinuity';

/** Builds a short, privacy-safe goal continuity hint for prompts. */
export function buildGoalContinuityHint(
  ctx: Pick<
    GoalContinuityContext,
    | 'recommendedGoalTransition'
    | 'recommendedNextGoal'
    | 'currentGoal'
    | 'completionDetected'
    | 'goalStagnationDetected'
    | 'suggestedStayReason'
    | 'suggestedAdvanceReason'
  >
): string | null {
  if (
    (ctx.recommendedGoalTransition === 'advance' || ctx.recommendedGoalTransition === 'closure') &&
    ctx.recommendedNextGoal
  ) {
    if (ctx.completionDetected) {
      return `This thread looks ready — move forward toward ${ctx.recommendedNextGoal}.`;
    }
    return `Consider pushing toward ${ctx.recommendedNextGoal}.`;
  }

  if (ctx.recommendedGoalTransition === 'stay' && ctx.goalStagnationDetected) {
    const reason = ctx.suggestedStayReason ?? 'the real trigger is not clear yet';
    return `Keep investigating ${ctx.currentGoal} because ${reason.toLowerCase()}.`;
  }

  if (ctx.recommendedGoalTransition === 'stay' && ctx.suggestedStayReason) {
    return `Keep investigating ${ctx.currentGoal} because ${ctx.suggestedStayReason.toLowerCase()}.`;
  }

  if (ctx.suggestedAdvanceReason && ctx.recommendedNextGoal) {
    return `Move toward ${ctx.recommendedNextGoal}: ${ctx.suggestedAdvanceReason}`;
  }

  return null;
}
