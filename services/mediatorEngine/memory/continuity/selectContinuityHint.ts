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
      return 'The last angle missed — continue the investigation from a different entry point.';
    }
    return `The last ${lastIneffective} angle missed — dig deeper from a different side.`;
  }

  if (partial.repeatedMoveDetected) {
    return 'Do not repeat the previous move — break the circular argument with a new angle.';
  }

  if (partial.staleTopicDetected) {
    return 'The conversation may be stuck — challenge assumptions, find the real trigger, focus the thread.';
  }

  if (partial.suggestedPreferTypes.length > 0) {
    return 'Build on what moved the conversation forward; keep investigating with Mościk directness.';
  }

  return null;
}
