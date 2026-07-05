import type { ExpectedEffect, InterventionTarget, InterventionType } from '@/types/mediator';
import { expectedEffectTemplateForType } from '@/services/mediatorEngine/intervention/config/defaultExpectedEffects';

/** Builds the expected effect for an intervention type. */
export function buildExpectedEffect(
  type: InterventionType,
  targetParticipant: InterventionTarget = 'both'
): ExpectedEffect {
  return expectedEffectTemplateForType(type, targetParticipant);
}
