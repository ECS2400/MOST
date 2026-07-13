import type {
  DraftMediatorReply,
  MediatorLang,
  ResponseValidationInput,
  SafetyLevel,
} from '@/types/mediator';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { createRichPipelineInput } from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

export function createDraftReply(
  text: string,
  overrides: Partial<DraftMediatorReply> = {}
): DraftMediatorReply {
  const language = overrides.language ?? 'en';
  return {
    text,
    language,
    safetyLevel: overrides.safetyLevel ?? 'none',
    source: overrides.source ?? 'llm',
    validation: overrides.validation ?? {
      valid: true,
      reasons: [],
      blockedTermsFound: [],
      questionCount: (text.match(/\?/g) ?? []).length,
      sentenceCount: Math.max(text.split(/[.!?]+/).filter(Boolean).length, text.trim() ? 1 : 0),
      lengthChars: text.length,
      safetyCompliant: true,
    },
    metadata: overrides.metadata ?? {
      turnNumber: 3,
      providerId: 'fake-llm',
      model: 'fake-model',
      generatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

export function createValidationInput(
  overrides: Partial<ResponseValidationInput> = {}
): ResponseValidationInput {
  const language = overrides.language ?? 'en';
  return {
    draftReply: overrides.draftReply ?? createDraftReply(
      'I hear that this feels heavy for both of you. Let us speak one at a time.',
      { language }
    ),
    promptComposerOutput: overrides.promptComposerOutput ?? composePrompt(createRichPipelineInput(language)),
    safetyLevel: overrides.safetyLevel ?? 'none',
    language,
    turnNumber: overrides.turnNumber ?? 3,
    attemptNumber: overrides.attemptNumber ?? 1,
    maxAttempts: overrides.maxAttempts ?? RESPONSE_VALIDATION_LIMITS.defaultMaxAttempts,
    ...overrides,
  };
}

/** Validation input with a non-exploration goal so localized fallback text can pass therapeutic flow. */
export function createFallbackAcceptanceValidationInput(
  overrides: Partial<ResponseValidationInput> = {}
): ResponseValidationInput {
  const language = overrides.language ?? 'en';
  const promptComposerOutput =
    overrides.promptComposerOutput ?? composePrompt(createRichPipelineInput(language));
  promptComposerOutput.promptMetadata = {
    ...promptComposerOutput.promptMetadata,
    goal: 'FUTURE_PLAN',
  };

  return createValidationInput({
    ...overrides,
    language,
    promptComposerOutput,
  });
}

export { RESPONSE_VALIDATION_LIMITS };
