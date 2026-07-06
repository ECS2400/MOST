import type { ContinuityContext } from '@/types/mediator/continuity';

/** Selects a short, privacy-safe continuity hint for prompt composition. */
export function selectContinuityHint(
  partial: Pick<
    ContinuityContext,
    | 'repeatedMoveDetected'
    | 'staleTopicDetected'
    | 'lastIneffectiveInterventionType'
    | 'suggestedAvoidTypes'
    | 'suggestedPreferTypes'
  >
): string | null {
  const lastIneffective = partial.lastIneffectiveInterventionType;

  if (lastIneffective && partial.suggestedAvoidTypes.includes(lastIneffective)) {
    if (lastIneffective === 'reflect') {
      return 'The last reflection appeared ineffective; prefer a validating or clarifying move.';
    }
    return `The last ${lastIneffective} move appeared ineffective; use a different angle.`;
  }

  if (partial.repeatedMoveDetected) {
    return 'Do not repeat the previous mediator move. Use a different angle.';
  }

  if (partial.staleTopicDetected) {
    return 'The current topic may be stuck; try a validating, reframing, or clarifying move.';
  }

  if (partial.suggestedPreferTypes.length > 0) {
    return 'Build on what worked recently; vary tone while keeping the same therapeutic direction.';
  }

  return null;
}
