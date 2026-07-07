import type { ContinuityContext, InterventionType } from '@/types/mediator';
import { ADAPTIVE_INTERVENTION_RULES } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/config/adaptiveInterventionRules';
import type {
  AdaptiveInterventionSelectionInput,
  InterventionCandidate,
  ScoredInterventionCandidate,
} from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/types';

function countRecentType(recent: readonly InterventionType[], type: InterventionType): number {
  return recent.filter((entry) => entry === type).length;
}

function continuityLists(continuity: ContinuityContext | null | undefined) {
  return {
    prefer: continuity?.suggestedPreferTypes ?? [],
    avoid: continuity?.suggestedAvoidTypes ?? [],
    recent: continuity?.recentInterventionTypes ?? [],
    lastEffective: continuity?.lastEffectiveInterventionType ?? null,
    lastIneffective: continuity?.lastIneffectiveInterventionType ?? null,
    repeatedMoveDetected: continuity?.repeatedMoveDetected === true,
  };
}

/** Scores a single intervention candidate from continuity and priority signals. */
export function scoreInterventionCandidate(
  input: AdaptiveInterventionSelectionInput,
  candidate: InterventionCandidate
): ScoredInterventionCandidate {
  if (input.safetyActive) {
    return { candidate, score: 0 };
  }

  const { WEIGHTS, BASELINE_BONUS, RECENT_REPEAT_THRESHOLD } = ADAPTIVE_INTERVENTION_RULES;
  const { type } = candidate;
  const continuity = continuityLists(input.continuityContext);
  let score = 0;

  if (candidate.kind === 'baseline') {
    score += BASELINE_BONUS;
  }

  if (input.recommendedInterventionType === type) {
    score += WEIGHTS.recommended;
  }

  if (continuity.prefer.includes(type)) {
    score += WEIGHTS.prefer;
  }

  if (continuity.avoid.includes(type)) {
    score += WEIGHTS.avoid;
  }

  if (continuity.lastEffective === type) {
    score += WEIGHTS.lastEffective;
  }

  if (continuity.lastIneffective === type) {
    score += WEIGHTS.lastIneffective;
  }

  if (countRecentType(continuity.recent, type) >= RECENT_REPEAT_THRESHOLD) {
    score += WEIGHTS.recentRepeat;
  }

  if (continuity.repeatedMoveDetected && continuity.recent[0] === type) {
    score += WEIGHTS.repeatedMove;
  }

  return { candidate, score: Math.max(0, score) };
}
