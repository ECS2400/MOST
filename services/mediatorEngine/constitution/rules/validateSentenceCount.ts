import { combineInterventionTextSafe } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { countSentences } from '@/services/mediatorEngine/constitution/lib/textMetrics';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.sentence_count';

/** Ensures the combined message does not exceed the maximum sentence count. */
export function validateSentenceCount(ctx: ConstitutionL1Context) {
  const text = combineInterventionTextSafe(ctx.intervention);
  const sentences = countSentences(text);
  if (sentences <= ctx.limits.maxSentencesDefault) return null;
  return createViolation(
    RULE_ID,
    `${sentences} sentences (max ${ctx.limits.maxSentencesDefault})`
  );
}
