import type { InterventionType } from '@/types/mediator';

/** Returns true when the intervention type is in the allowed list. */
export function isAllowedIntervention(
  type: InterventionType,
  allowed: readonly InterventionType[]
): boolean {
  return allowed.includes(type);
}
