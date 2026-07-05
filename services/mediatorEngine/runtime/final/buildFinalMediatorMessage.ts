import type {
  FinalMediatorMessage,
  MediatorLang,
  ResponseValidationAction,
  ResponseValidationResult,
  SafetyLevel,
  TurnNumber,
} from '@/types/mediator';
import type { DraftMediatorReply } from '@/types/mediator';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';

/** Builds the user-facing final mediator message. */
export function buildFinalMediatorMessage(
  reply: DraftMediatorReply | null,
  validationAction: ResponseValidationAction,
  language: MediatorLang,
  safetyLevel: SafetyLevel,
  turnNumber: TurnNumber
): FinalMediatorMessage {
  const resolved =
    reply ??
    createFallbackMediatorReply(language, safetyLevel, turnNumber, ['Missing validated reply']);

  const accepted = validationAction === 'accept' || validationAction === 'fallback';
  const text = resolved.text.trim() || createFallbackMediatorReply(language, safetyLevel, turnNumber).text;

  return {
    text,
    source: resolved.source,
    safetyLevel: resolved.safetyLevel ?? safetyLevel,
    language: resolved.language ?? language,
    turnNumber,
    accepted,
    validationAction,
  };
}

/** Resolves which draft reply to use for the final message. */
export function resolveFinalDraftReply(
  validation: ResponseValidationResult
): DraftMediatorReply | null {
  if (validation.action === 'accept') return validation.validatedReply;
  if (validation.action === 'fallback') return validation.fallbackReply ?? validation.validatedReply;
  return null;
}

export type { FinalMediatorMessage };
