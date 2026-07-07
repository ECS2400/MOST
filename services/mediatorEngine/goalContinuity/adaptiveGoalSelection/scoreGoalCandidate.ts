import type { TherapeuticGoal } from '@/types/mediator';
import { GOAL_FLOW_ORDER } from '@/services/mediatorEngine/goalContinuity/config/goalFlow';
import { ADAPTIVE_GOAL_RULES } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/config/adaptiveGoalRules';
import { isSafetyBlocking } from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/goalTransitionGuards';
import type {
  AdaptiveGoalSelectionInput,
  GoalCandidate,
  ScoredGoalCandidate,
} from '@/services/mediatorEngine/goalContinuity/adaptiveGoalSelection/types';

function isForwardCandidate(
  currentGoal: TherapeuticGoal,
  candidateGoal: TherapeuticGoal
): boolean {
  const currentIndex = GOAL_FLOW_ORDER.indexOf(currentGoal);
  const candidateIndex = GOAL_FLOW_ORDER.indexOf(candidateGoal);
  return candidateIndex > currentIndex;
}

/** Scores a single goal candidate from structural session signals. */
export function scoreGoalCandidate(
  input: AdaptiveGoalSelectionInput,
  candidate: GoalCandidate
): ScoredGoalCandidate {
  if (isSafetyBlocking(input.safety)) {
    return { candidate, score: 0 };
  }

  const { WEIGHTS } = ADAPTIVE_GOAL_RULES;
  let score = 0;

  if (candidate.kind === 'baseline') {
    score += ADAPTIVE_GOAL_RULES.BASELINE_BONUS;
  }

  if (input.completionDetected && candidate.kind !== 'regress') {
    score += WEIGHTS.completion;
  }

  if (input.bothReady && candidate.kind !== 'regress') {
    score += WEIGHTS.bothReady;
  }

  if (
    input.acceptedByBoth &&
    candidate.kind !== 'baseline' &&
    (candidate.goal === 'FUTURE_PLAN' || candidate.goal === 'CLOSURE')
  ) {
    score += WEIGHTS.acceptedByBoth + WEIGHTS.fastTrack;
  }

  if (input.mutualUnderstandingScore >= ADAPTIVE_GOAL_RULES.MUTUAL_UNDERSTANDING_HIGH) {
    if (isForwardCandidate(input.currentGoal, candidate.goal) || candidate.kind === 'fast_track') {
      score += WEIGHTS.mutualUnderstandingHigh;
    }
  }

  if (
    input.mutualUnderstandingScore < ADAPTIVE_GOAL_RULES.MUTUAL_UNDERSTANDING_LOW &&
    input.currentGoal === 'PERSPECTIVE_SHARING' &&
    candidate.goal === 'REFRAME'
  ) {
    score += WEIGHTS.mutualUnderstandingLow;
  }

  if (input.goalStagnationDetected && candidate.kind === 'skip') {
    score += WEIGHTS.stagnation;
  }

  if (candidate.kind === 'regress' && input.goalStagnationDetected) {
    score += WEIGHTS.stagnation;
  }

  if (
    input.completedGoals.includes('AGREEMENT') &&
    (candidate.goal === 'FUTURE_PLAN' || candidate.goal === 'CLOSURE')
  ) {
    score += WEIGHTS.fastTrack;
  }

  return { candidate, score: Math.max(0, score) };
}
