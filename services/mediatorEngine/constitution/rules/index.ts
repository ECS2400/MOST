import { validateDuplicateIntervention } from '@/services/mediatorEngine/constitution/rules/validateDuplicateIntervention';
import { validateDuplicateText } from '@/services/mediatorEngine/constitution/rules/validateDuplicateText';
import { validateExpectedEffect } from '@/services/mediatorEngine/constitution/rules/validateExpectedEffect';
import { validateGoal } from '@/services/mediatorEngine/constitution/rules/validateGoal';
import { validateIntent } from '@/services/mediatorEngine/constitution/rules/validateIntent';
import { validateMessageLength } from '@/services/mediatorEngine/constitution/rules/validateMessageLength';
import { validateNonEmptyMessage } from '@/services/mediatorEngine/constitution/rules/validateNonEmptyMessage';
import { validateQuestionCount } from '@/services/mediatorEngine/constitution/rules/validateQuestionCount';
import { validateRequiredFields } from '@/services/mediatorEngine/constitution/rules/validateRequiredFields';
import { validateSentenceCount } from '@/services/mediatorEngine/constitution/rules/validateSentenceCount';
import { validateSessionPersonality } from '@/services/mediatorEngine/constitution/rules/validateSessionPersonality';
import { validateStrategyInterventionType } from '@/services/mediatorEngine/constitution/rules/validateStrategyInterventionType';
import type { ConstitutionL1Rule } from '@/services/mediatorEngine/constitution/rules/types';

/**
 * Registry of all L1 deterministic constitution rules.
 *
 * To add a rule: create `validateX.ts` and append an entry here — no other files need editing.
 */
export const CONSTITUTION_L1_RULES: readonly ConstitutionL1Rule[] = [
  {
    ruleId: 'l1.required_fields',
    articleRef: 'Art. 14',
    defaultSeverity: 'block',
    validate: validateRequiredFields,
  },
  {
    ruleId: 'l1.non_empty_message',
    articleRef: 'Art. 3',
    defaultSeverity: 'block',
    validate: validateNonEmptyMessage,
  },
  {
    ruleId: 'l1.message_length',
    articleRef: 'Art. 4',
    defaultSeverity: 'block',
    validate: validateMessageLength,
  },
  {
    ruleId: 'l1.duplicate_text',
    articleRef: 'Art. 5',
    defaultSeverity: 'block',
    validate: validateDuplicateText,
  },
  {
    ruleId: 'l1.duplicate_intervention',
    articleRef: 'Art. 6',
    defaultSeverity: 'block',
    validate: validateDuplicateIntervention,
  },
  {
    ruleId: 'l1.question_count',
    articleRef: 'Art. 7',
    defaultSeverity: 'block',
    validate: validateQuestionCount,
  },
  {
    ruleId: 'l1.sentence_count',
    articleRef: 'Art. 8',
    defaultSeverity: 'block',
    validate: validateSentenceCount,
  },
  {
    ruleId: 'l1.expected_effect',
    articleRef: 'Art. 9',
    defaultSeverity: 'block',
    validate: validateExpectedEffect,
  },
  {
    ruleId: 'l1.intent',
    articleRef: 'Art. 10',
    defaultSeverity: 'block',
    validate: validateIntent,
  },
  {
    ruleId: 'l1.goal',
    articleRef: 'Art. 11',
    defaultSeverity: 'block',
    validate: validateGoal,
  },
  {
    ruleId: 'l1.strategy_intervention_type',
    articleRef: 'Art. 12',
    defaultSeverity: 'block',
    validate: validateStrategyInterventionType,
  },
  {
    ruleId: 'l1.session_personality',
    articleRef: 'Art. 13',
    defaultSeverity: 'warn',
    validate: validateSessionPersonality,
  },
];

/** All L1 deterministic rules always run on MVP — applicableRules only overrides severity/articleRef. */
export function getAllL1Rules(): readonly ConstitutionL1Rule[] {
  return CONSTITUTION_L1_RULES;
}
