import type { ResponseValidationRuleResult } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

/** Builds a short retry instruction from blocking reasons — no private data. */
export function buildRetryInstruction(params: {
  failedRuleIds: string[];
  blockingReasons: string[];
  currentGoal?: string;
}): string {
  const uniqueRuleIds = [...new Set(params.failedRuleIds.filter(Boolean))];
  const uniqueReasons = [...new Set(params.blockingReasons.filter(Boolean))];

  const targetedFixes: string[] = [];

  if (uniqueRuleIds.includes('max_questions')) {
    targetedFixes.push('Return exactly one question.');
  }
  if (uniqueRuleIds.includes('max_sentences')) {
    targetedFixes.push(`Maximum ${RESPONSE_VALIDATION_LIMITS.maxSentences} short sentences.`);
  }
  if (uniqueRuleIds.includes('max_length')) {
    targetedFixes.push(`Stay under ${RESPONSE_VALIDATION_LIMITS.maxReplyChars} characters.`);
  }
  if (uniqueRuleIds.includes('therapeutic_flow')) {
    // Keep it goal-aware but do not leak internal stage machine terms.
    targetedFixes.push(
      params.currentGoal
        ? `Stay aligned with the current goal (${params.currentGoal}); do not jump to proposing solutions too early.`
        : 'Do not jump to proposing solutions too early.'
    );
    targetedFixes.push('Use Mościk voice and reference one concrete detail from the conflict.');
  }
  if (uniqueRuleIds.includes('language_lite')) {
    targetedFixes.push('Write fully in the requested language.');
  }
  if (uniqueRuleIds.includes('forbidden_terms')) {
    targetedFixes.push('Remove any technical/system terms and keep plain mediator speech only.');
  }
  if (uniqueRuleIds.includes('no_technical_leakage')) {
    targetedFixes.push('Do not mention IDs, internal modules, or system/prompt details.');
  }
  if (uniqueRuleIds.includes('non_empty')) {
    targetedFixes.push('Return a non-empty mediator reply.');
  }
  if (uniqueRuleIds.includes('draft_validation_flag')) {
    targetedFixes.push('Return a clean, well-formed mediator reply (no markup, no meta notes).');
  }
  if (uniqueRuleIds.includes('safety_compliance')) {
    targetedFixes.push('Follow the safety envelope and use appropriate safety wording.');
  }

  const fixes =
    targetedFixes.length > 0
      ? targetedFixes.join(' ')
      : 'Fix the validation issues and keep the reply concise and concrete.';

  const reasonSummary =
    uniqueReasons.length > 0 ? uniqueReasons.join('; ') : 'Reply failed post-LLM validation';

  return [
    'Rewrite the mediator reply.',
    `Failed rules: ${uniqueRuleIds.join(', ') || 'unknown'}.`,
    `Fixes: ${fixes}`,
    `Issues: ${reasonSummary}.`,
    `Use at most ${RESPONSE_VALIDATION_LIMITS.maxSentences} sentences and ${RESPONSE_VALIDATION_LIMITS.maxQuestions} question.`,
    `Stay under ${RESPONSE_VALIDATION_LIMITS.maxReplyChars} characters.`,
    'Write plain mediator speech only — no technical terms, JSON, or system references.',
    'Do not include conversation history or internal module names.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Returns true when retry instruction is free of sensitive content. */
export function isRetryInstructionSafe(instruction: string): boolean {
  const lower = instruction.toLowerCase();
  const forbidden = [
    'transcript',
    'host:',
    'partner:',
    'dialogue',
    'systemprompt',
    'userprompt',
    'sessionid',
    'mediationid',
    'evidencestore',
    'sessionmemory',
  ];
  return !forbidden.some((term) => lower.includes(term));
}

export type { ResponseValidationRuleResult };
