import { combineInterventionTextSafe } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import { countQuestions } from '@/services/mediatorEngine/constitution/lib/textMetrics';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.question_count';

/** Ensures the combined message does not exceed the maximum question count. */
export function validateQuestionCount(ctx: ConstitutionL1Context) {
  const text = combineInterventionTextSafe(ctx.intervention);
  const questions = countQuestions(text);
  if (questions <= ctx.limits.maxQuestionsDefault) return null;
  return createViolation(
    RULE_ID,
    `${questions} questions (max ${ctx.limits.maxQuestionsDefault})`
  );
}
