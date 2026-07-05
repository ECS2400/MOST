import type { ResponseValidationInput, ResponseValidationResult } from '@/types/mediator';
import { resolveResponseValidation } from '@/services/mediatorEngine/responseValidator/resolve/buildResponseValidationResult';
import { buildValidatedFallback } from '@/services/mediatorEngine/responseValidator/fallback/buildValidatedFallback';
import { safeResponseValidationInput } from '@/services/mediatorEngine/responseValidator/lib/safeResponseValidationInput';

/**
 * Validates a DraftMediatorReply after LLM generation.
 *
 * Does not call LLM. Does not generate prompts. Never throws.
 */
export function validateMediatorReply(input: ResponseValidationInput | unknown): ResponseValidationResult {
  const validatedAt = new Date().toISOString();

  try {
    const ctx = safeResponseValidationInput(input);
    return resolveResponseValidation(ctx, validatedAt);
  } catch {
    const fallbackReply = buildValidatedFallback('en', 'none', 1, ['Unexpected validation error']);
    return {
      valid: false,
      action: 'fallback',
      ruleResults: [],
      blockingReasons: ['Unexpected validation error'],
      warningReasons: [],
      retryInstruction: null,
      fallbackReply,
      validatedReply: fallbackReply,
      validatedAt,
    };
  }
}
