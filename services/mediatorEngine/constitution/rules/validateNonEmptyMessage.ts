import { getPrimaryMessage } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.non_empty_message';

/** Ensures the primary message is not empty or whitespace-only. */
export function validateNonEmptyMessage(ctx: ConstitutionL1Context) {
  const text = getPrimaryMessage(ctx.intervention).trim();
  if (text.length >= ctx.limits.minMessageLength) return null;
  return createViolation(RULE_ID, text || '(empty)');
}
