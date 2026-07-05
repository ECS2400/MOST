import { getInterventionCoreFields } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { VALID_THERAPEUTIC_INTENTS } from '@/services/mediatorEngine/constitution/lib/vocabularies';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.intent';

/** Ensures intervention intent is a known therapeutic intent value. */
export function validateIntent(ctx: ConstitutionL1Context) {
  const { intent } = getInterventionCoreFields(ctx.intervention);
  if (!intent) return null;
  if (VALID_THERAPEUTIC_INTENTS.includes(intent as never)) return null;
  return createViolation(RULE_ID, intent);
}
