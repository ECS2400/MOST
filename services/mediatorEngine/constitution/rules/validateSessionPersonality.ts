import { PERSONALITY_PROFILE_LIMITS } from '@/services/mediatorEngine/constitution/config/personalityLimits';
import { combineInterventionTextSafe } from '@/services/mediatorEngine/constitution/lib/safeIntervention';
import {
  countExclamationMarks,
  countQuestions,
  countSentences,
} from '@/services/mediatorEngine/constitution/lib/textMetrics';
import { createViolation } from '@/services/mediatorEngine/constitution/rules/createViolation';
import type { ConstitutionL1Context } from '@/services/mediatorEngine/constitution/rules/types';

const RULE_ID = 'l1.session_personality';

/** Applies deterministic per-profile sentence, question, and punctuation limits. */
export function validateSessionPersonality(ctx: ConstitutionL1Context) {
  if (!ctx.sessionPersonality) return null;

  const limits = PERSONALITY_PROFILE_LIMITS[ctx.sessionPersonality.profile];
  const text = combineInterventionTextSafe(ctx.intervention);

  const sentences = countSentences(text);
  if (sentences > limits.maxSentences) {
    return createViolation(
      RULE_ID,
      `${sentences} sentences (max ${limits.maxSentences} for ${ctx.sessionPersonality.profile})`
    );
  }

  const questions = countQuestions(text);
  if (questions > limits.maxQuestions) {
    return createViolation(
      RULE_ID,
      `${questions} questions (max ${limits.maxQuestions} for ${ctx.sessionPersonality.profile})`
    );
  }

  const exclamations = countExclamationMarks(text);
  if (exclamations > limits.maxExclamationMarks) {
    return createViolation(
      RULE_ID,
      `${exclamations} exclamation marks (max ${limits.maxExclamationMarks} for ${ctx.sessionPersonality.profile})`
    );
  }

  return null;
}
