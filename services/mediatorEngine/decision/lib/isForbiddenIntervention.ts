import type { InterventionType } from '@/types/mediator';

/** Returns true when the intervention type is in the forbidden list. */
export function isForbiddenIntervention(
  type: InterventionType,
  forbidden: readonly InterventionType[]
): boolean {
  return forbidden.includes(type);
}
