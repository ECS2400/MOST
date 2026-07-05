import {
  getPrimaryMessage,
  getSecondaryMessage,
} from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { combineInterventionText, findRepeatedSentence } from '@/services/mediatorEngine/constitution/lib/textMetrics';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.duplicate_text';

/** Blocks identical primary/secondary text or repeated sentence fragments. */
export function validateDuplicateText(ctx: ConstitutionL1Context) {
  const primaryMessage = getPrimaryMessage(ctx.intervention);
  const secondaryMessage = getSecondaryMessage(ctx.intervention);

  if (secondaryMessage && primaryMessage.trim() === secondaryMessage.trim()) {
    return createViolation(RULE_ID, primaryMessage.trim());
  }

  const combined = combineInterventionText(primaryMessage, secondaryMessage);
  const repeated = findRepeatedSentence(combined, ctx.limits.minRepeatedSentenceLength);
  if (repeated) {
    return createViolation(RULE_ID, repeated);
  }
  return null;
}
