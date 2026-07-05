import { combineInterventionTextSafe } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.message_length';

/** Ensures combined message length does not exceed the L1 maximum. */
export function validateMessageLength(ctx: ConstitutionL1Context) {
  const text = combineInterventionTextSafe(ctx.intervention);
  if (text.length <= ctx.limits.maxMessageLength) return null;
  return createViolation(
    RULE_ID,
    `${text.length} chars (max ${ctx.limits.maxMessageLength})`
  );
}
