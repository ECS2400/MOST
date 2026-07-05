import { getInterventionCoreFields } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { VALID_THERAPEUTIC_GOALS } from '@/services/mediatorEngine/constitution/lib/vocabularies';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.goal';

/** Ensures intervention goal is a known therapeutic goal value. */
export function validateGoal(ctx: ConstitutionL1Context) {
  const { goal } = getInterventionCoreFields(ctx.intervention);
  if (!goal) return null;
  if (VALID_THERAPEUTIC_GOALS.includes(goal as never)) return null;
  return createViolation(RULE_ID, goal);
}
