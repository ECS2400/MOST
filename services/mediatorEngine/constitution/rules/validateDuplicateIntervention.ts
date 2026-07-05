import {
  getDoNotRepeatBefore,
  getInterventionSignature,
} from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.duplicate_intervention';

/** Blocks repeating the same intervention signature within the repeat window. */
export function validateDuplicateIntervention(ctx: ConstitutionL1Context) {
  const signature = getInterventionSignature(ctx.intervention);
  const doNotRepeatBefore = getDoNotRepeatBefore(ctx.intervention);

  if (doNotRepeatBefore !== undefined && ctx.turnNumber < doNotRepeatBefore) {
    return createViolation(
      RULE_ID,
      `turn ${ctx.turnNumber} < doNotRepeatBefore ${doNotRepeatBefore}`
    );
  }

  if (signature && ctx.recentInterventionSignatures.includes(signature)) {
    return createViolation(RULE_ID, signature);
  }

  return null;
}
