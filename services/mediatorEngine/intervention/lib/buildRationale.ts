import type { InterventionType, TherapeuticStrategy } from '@/types/mediator';
import {
  RATIONALE_FROM_DECISION,
  RATIONALE_FROM_SAFETY_OVERRIDE,
  SAFETY_OVERRIDE_INTERVENTION_TYPES,
} from '@/services/mediatorEngine/intervention/config/defaultRationales';

/** Builds a short technical rationale for the intervention record. */
export function buildRationale(input: {
  type: InterventionType;
  strategy: TherapeuticStrategy;
}): string {
  if (
    input.strategy === 'build_safety' &&
    SAFETY_OVERRIDE_INTERVENTION_TYPES.has(input.type)
  ) {
    return RATIONALE_FROM_SAFETY_OVERRIDE;
  }
  return RATIONALE_FROM_DECISION;
}
