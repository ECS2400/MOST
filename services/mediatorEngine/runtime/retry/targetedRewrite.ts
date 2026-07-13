import type { DraftMediatorReply, MediatorLang, SafetyLevel, TurnNumber } from '@/types/mediator';
import { validateDraftReply } from '@/services/mediatorEngine/llm/validate/validateDraftReply';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Very light heuristic: split on ., !, ? followed by whitespace.
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function enforceMaxQuestions(text: string, maxQuestions: number): string {
  if (maxQuestions >= 1) {
    let seen = 0;
    let out = '';
    for (const ch of text) {
      if (ch === '?') {
        seen += 1;
        out += seen > maxQuestions ? '.' : ch;
        continue;
      }
      out += ch;
    }
    return out;
  }
  return text.replaceAll('?', '.');
}

function enforceMaxSentences(text: string, maxSentences: number): string {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= maxSentences) return text.trim();
  return sentences.slice(0, maxSentences).join(' ');
}

function enforceMaxLength(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const sentences = splitIntoSentences(trimmed);
  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxChars) break;
    out = next;
  }
  if (out.trim().length > 0) return out.trim();
  return trimmed.slice(0, maxChars).trim();
}

/**
 * Best-effort deterministic rewrite for small, structural violations (length/questions/sentences).
 * Returns null when no safe rewrite is possible.
 */
export function tryTargetedRewrite(params: {
  draftReply: DraftMediatorReply;
  failedRuleIds: string[];
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  turnNumber: TurnNumber;
}): DraftMediatorReply | null {
  const failed = new Set(params.failedRuleIds);
  const allowed = new Set(['max_questions', 'max_sentences', 'max_length']);
  for (const id of failed) {
    if (!allowed.has(id)) return null;
  }

  let text = params.draftReply.text;
  if (failed.has('max_questions')) {
    text = enforceMaxQuestions(text, RESPONSE_VALIDATION_LIMITS.maxQuestions);
  }
  if (failed.has('max_sentences')) {
    text = enforceMaxSentences(text, RESPONSE_VALIDATION_LIMITS.maxSentences);
  }
  if (failed.has('max_length')) {
    text = enforceMaxLength(text, RESPONSE_VALIDATION_LIMITS.maxReplyChars);
  }

  if (!text.trim() || text.trim() === params.draftReply.text.trim()) {
    return null;
  }

  const validation = validateDraftReply(text, params.language, params.safetyLevel);
  return {
    ...params.draftReply,
    text,
    validation,
  };
}

