import { getInterventionSignature } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.duplicate_intervention';

/** Blocks repeating the same intervention signature within the repeat window. */
export function validateDuplicateIntervention(ctx: ConstitutionL1Context) {
  const signature = getInterventionSignature(ctx.intervention);

  if (signature && ctx.recentInterventionSignatures.includes(signature)) {
    return createViolation(RULE_ID, signature);
  }

  return null;
}
