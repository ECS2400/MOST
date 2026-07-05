import type {
  DraftMediatorReply,
  MediatorLang,
  PromptComposerOutput,
  ResponseValidationContext,
  ResponseValidationInput,
  SafetyLevel,
  TurnNumber,
} from '@/types/mediator';
import { createFallbackPromptOutput } from '@/services/mediatorEngine/llm/fallback/createFallbackPromptOutput';
import { RESPONSE_VALIDATION_LIMITS } from '@/services/mediatorEngine/responseValidator/config/responseValidationLimits';

const SUPPORTED_LANGUAGES: MediatorLang[] = ['pl', 'en', 'it', 'de', 'fr', 'es'];
const VALID_SAFETY_LEVELS: SafetyLevel[] = ['none', 'L1_gentle', 'L2_pause', 'L3_stop'];

function normalizeLanguage(value: unknown): MediatorLang {
  if (typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as MediatorLang)) {
    return value as MediatorLang;
  }
  return 'en';
}

function normalizeSafetyLevel(value: unknown): SafetyLevel {
  if (typeof value === 'string' && VALID_SAFETY_LEVELS.includes(value as SafetyLevel)) {
    return value as SafetyLevel;
  }
  return 'none';
}

function normalizeTurnNumber(value: unknown): TurnNumber {
  return typeof value === 'number' && value > 0 ? (value as TurnNumber) : 1;
}

function normalizeAttemptNumber(value: unknown): number {
  return typeof value === 'number' && value > 0 ? value : 1;
}

function normalizeMaxAttempts(value: unknown): number {
  return typeof value === 'number' && value > 0
    ? value
    : RESPONSE_VALIDATION_LIMITS.defaultMaxAttempts;
}

function createEmptyDraftReply(
  language: MediatorLang,
  safetyLevel: SafetyLevel,
  turnNumber: TurnNumber
): DraftMediatorReply {
  return {
    text: '',
    language,
    safetyLevel,
    source: 'fallback',
    validation: {
      valid: false,
      reasons: ['Malformed draft reply input'],
      blockedTermsFound: [],
      questionCount: 0,
      sentenceCount: 0,
      lengthChars: 0,
      safetyCompliant: false,
    },
    metadata: {
      turnNumber,
      providerId: 'unknown',
      model: 'unknown',
      generatedAt: new Date().toISOString(),
    },
  };
}

function normalizeDraftReply(value: unknown, language: MediatorLang, safetyLevel: SafetyLevel, turnNumber: TurnNumber): DraftMediatorReply {
  if (value && typeof value === 'object' && typeof (value as DraftMediatorReply).text === 'string') {
    const draft = value as DraftMediatorReply;
    return {
      ...draft,
      language: normalizeLanguage(draft.language ?? language),
      safetyLevel: normalizeSafetyLevel(draft.safetyLevel ?? safetyLevel),
      validation:
        draft.validation && typeof draft.validation === 'object'
          ? draft.validation
          : {
              valid: false,
              reasons: ['Missing draft validation'],
              blockedTermsFound: [],
              questionCount: 0,
              sentenceCount: 0,
              lengthChars: draft.text.length,
              safetyCompliant: false,
            },
      metadata:
        draft.metadata && typeof draft.metadata === 'object'
          ? draft.metadata
          : {
              turnNumber,
              providerId: 'unknown',
              model: 'unknown',
              generatedAt: new Date().toISOString(),
            },
    };
  }
  return createEmptyDraftReply(language, safetyLevel, turnNumber);
}

function normalizePromptOutput(
  value: unknown,
  language: MediatorLang,
  safetyLevel: SafetyLevel
): PromptComposerOutput {
  if (value && typeof value === 'object' && typeof (value as PromptComposerOutput).systemPrompt === 'string') {
    return value as PromptComposerOutput;
  }
  return createFallbackPromptOutput(language, safetyLevel);
}

/** Normalizes response validation input — never throws. */
export function safeResponseValidationInput(input: unknown): ResponseValidationContext & {
  promptComposerOutput: PromptComposerOutput;
} {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<ResponseValidationInput>;

  const language = normalizeLanguage(raw.language);
  const safetyLevel = normalizeSafetyLevel(raw.safetyLevel);
  const turnNumber = normalizeTurnNumber(raw.turnNumber);
  const attemptNumber = normalizeAttemptNumber(raw.attemptNumber);
  const maxAttempts = normalizeMaxAttempts(raw.maxAttempts);
  const draftReply = normalizeDraftReply(raw.draftReply, language, safetyLevel, turnNumber);
  const promptComposerOutput = normalizePromptOutput(raw.promptComposerOutput, language, safetyLevel);

  return {
    text: typeof draftReply.text === 'string' ? draftReply.text : '',
    draftReply,
    safetyLevel,
    language,
    turnNumber,
    attemptNumber,
    maxAttempts,
    promptComposerOutput,
  };
}
