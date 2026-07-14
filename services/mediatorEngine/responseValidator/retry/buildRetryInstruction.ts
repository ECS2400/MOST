import type { RepetitionMatchRetryDetail, ResponseValidationRuleResult } from '@/types/mediator';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSnippet(text: string, maxLen = 80): string {
  const trimmed = text.trim();
  return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen - 3)}...`;
}

function extractFramingSnippets(priorText: string, matchedPhrase: string | null, maxSnippets = 2): string[] {
  const sentences = priorText
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 10);

  if (matchedPhrase) {
    const normalizedPhrase = normalizeText(matchedPhrase);
    const withPhrase = sentences.filter((sentence) => normalizeText(sentence).includes(normalizedPhrase));
    if (withPhrase.length > 0) {
      return withPhrase.slice(0, maxSnippets).map(truncateSnippet);
    }
  }

  return sentences.slice(0, maxSnippets).map(truncateSnippet);
}

function findRepeatedInterventionMatch(
  ruleResults?: ResponseValidationRuleResult[]
): RepetitionMatchRetryDetail | null {
  if (!Array.isArray(ruleResults)) return null;
  const failed = ruleResults.find(
    (result) => result.ruleId === 'repeated_intervention' && result.passed === false
  );
  return failed?.repetitionMatchDetail ?? null;
}

function buildRepeatedInterventionRetryGuidance(match: RepetitionMatchRetryDetail): string {
  const framingSnippets = extractFramingSnippets(match.priorText, match.matchedPhrase);
  const matchTypeLabel = match.matchTypes.length > 0 ? match.matchTypes.join(', ') : 'repeated_intervention';

  const lines = [
    `Match type: ${matchTypeLabel}.`,
    match.matchedPhrase ? `Matched phrase: "${match.matchedPhrase}".` : null,
    framingSnippets.length > 0
      ? `The previous draft repeated this framing:\n${framingSnippets.map((snippet) => `"${snippet}"`).join('\n')}`
      : null,
    'Do not paraphrase the opening summary.',
    "Use the participants' latest replies from the transcript delta and move the mediation forward.",
    'Change the intervention function (reflection, challenge, or repair) — do not restate prior framing.',
    'Ask one new question about a fresh concrete moment or contradiction.',
  ].filter((line): line is string => typeof line === 'string' && line.length > 0);

  return lines.join(' ');
}

/** Builds a short retry instruction from blocking reasons — no private data. */
export function buildRetryInstruction(params: {
  failedRuleIds: string[];
  blockingReasons: string[];
  currentGoal?: string;
  ruleResults?: ResponseValidationRuleResult[];
  draftValidationReasons?: string[];
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
  if (uniqueRuleIds.includes('repeated_intervention')) {
    const repetitionMatch = findRepeatedInterventionMatch(params.ruleResults);
    if (repetitionMatch) {
      targetedFixes.push(buildRepeatedInterventionRetryGuidance(repetitionMatch));
    } else {
      targetedFixes.push(
        'Do not restate the previous interpretation. Change strategy and ask about a different concrete moment or contradiction.'
      );
    }
  }
  if (uniqueRuleIds.includes('therapeutic_flow')) {
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
    const draftReasons = (params.draftValidationReasons ?? []).filter(Boolean);
    if (draftReasons.length > 0) {
      targetedFixes.push(`Fix draft bridge issues: ${draftReasons.join('; ')}.`);
    } else {
      targetedFixes.push('Return a clean, well-formed mediator reply (no markup, no meta notes).');
    }
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
