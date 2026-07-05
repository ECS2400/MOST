import type { DraftMediatorReply, MediatorLang, SafetyLevel, TurnNumber } from '@/types/mediator';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';

/** Builds a validated fallback reply using the LLM module fallback templates. */
export function buildValidatedFallback(
  language: MediatorLang,
  safetyLevel: SafetyLevel,
  turnNumber: TurnNumber,
  reasons: string[] = []
): DraftMediatorReply {
  return createFallbackMediatorReply(language, safetyLevel, turnNumber, reasons);
}
