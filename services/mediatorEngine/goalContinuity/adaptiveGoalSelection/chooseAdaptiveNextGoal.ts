import type { TherapeuticGoal } from '@/types/mediator';
import { nextGoalInFlow } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { buildGoalCandidateSet } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/buildGoalCandidateSet';
import { ADAPTIVE_GOAL_RULES } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/config/adaptiveGoalRules';
import { isSafetyBlocking } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/goalTransitionGuards';
import { scoreGoalCandidate } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/scoreGoalCandidate';
import type { AdaptiveGoalSelectionInput } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';

/** Chooses the next goal adaptively, falling back to the linear flow default. */
export function chooseAdaptiveNextGoal(
  input: AdaptiveGoalSelectionInput | null | undefined,
  fallbackGoal?: TherapeuticGoal | null
): TherapeuticGoal | null {
  const fallback = fallbackGoal ?? (input ? nextGoalInFlow(input.currentGoal) : null);
  if (!input || !fallback) return fallback;

  if (isSafetyBlocking(input.safety)) {
    return fallback;
  }

  const candidates = buildGoalCandidateSet(input);
  if (candidates.length === 0) return fallback;

  const scored = candidates.map((candidate) => scoreGoalCandidate(input, candidate));
  const baseline = scored.find((entry) => entry.candidate.kind === 'baseline');
  const baselineScore = baseline?.score ?? 0;

  let best = baseline ?? scored[0];
  for (const entry of scored) {
    if (entry.score > best.score) {
      best = entry;
    }
  }

  if (
    best.candidate.kind !== 'baseline' &&
    best.score >= ADAPTIVE_GOAL_RULES.MIN_SCORE &&
    best.score > baselineScore + ADAPTIVE_GOAL_RULES.MIN_ADAPTIVE_DELTA
  ) {
    return best.candidate.goal;
  }

  return fallback;
}
