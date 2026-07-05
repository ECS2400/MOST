import type { ResponseValidationRuleResult } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

/** Builds a short retry instruction from blocking reasons — no private data. */
export function buildRetryInstruction(blockingReasons: string[]): string {
  const uniqueReasons = [...new Set(blockingReasons.filter(Boolean))];
  const reasonSummary =
    uniqueReasons.length > 0
      ? uniqueReasons.join('; ')
      : 'Reply failed post-LLM validation';

  return [
    'Rewrite the mediator reply.',
    `Fix these issues: ${reasonSummary}.`,
    `Use at most ${RESPONSE_VALIDATION_LIMITS.maxSentences} sentences and ${RESPONSE_VALIDATION_LIMITS.maxQuestions} question.`,
    `Stay under ${RESPONSE_VALIDATION_LIMITS.maxReplyChars} characters.`,
    'Write plain mediator speech only — no technical terms, JSON, or system references.',
    'Do not include conversation history or internal module names.',
  ].join(' ');
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
