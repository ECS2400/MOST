import type {
  GenerateMediatorReplyInput,
  LlmProviderPort,
  MediatorLang,
  PromptComposerOutput,
  SafetyLevel,
  TurnNumber,
} from '@/types/mediator';
import { createFallbackPromptOutput } from '@/services/mediatorEngine/llm/fallback/createFallbackPromptOutput';

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

function normalizePromptOutput(value: unknown, language: MediatorLang, safetyLevel: SafetyLevel): PromptComposerOutput {
  if (value && typeof value === 'object' && typeof (value as PromptComposerOutput).systemPrompt === 'string') {
    return value as PromptComposerOutput;
  }
  return createFallbackPromptOutput(language, safetyLevel);
}

/** Normalized LLM bridge context — never throws. */
export interface SafeLlmContext {
  promptComposerOutput: PromptComposerOutput;
  provider: LlmProviderPort;
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  turnNumber: TurnNumber;
  retryInstruction: string | null;
  attemptNumber: number;
}

/** Normalizes generateMediatorReply input — never throws. */
export function safeLlmInput(input: unknown): SafeLlmContext {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<GenerateMediatorReplyInput>;

  const language = normalizeLanguage(raw.language);
  const safetyLevel = normalizeSafetyLevel(raw.safetyLevel);
  const turnNumber = normalizeTurnNumber(raw.turnNumber);
  const promptComposerOutput = normalizePromptOutput(raw.promptComposerOutput, language, safetyLevel);
  const retryInstruction = typeof raw.retryInstruction === 'string' ? raw.retryInstruction : null;
  const attemptNumber = typeof raw.attemptNumber === 'number' && raw.attemptNumber > 0 ? raw.attemptNumber : 1;

  const provider =
    raw.provider && typeof raw.provider === 'object' && typeof raw.provider.generateText === 'function'
      ? raw.provider
      : createMissingProviderStub();

  return {
    promptComposerOutput,
    provider,
    language,
    safetyLevel,
    turnNumber,
    retryInstruction,
    attemptNumber,
  };
}

function createMissingProviderStub(): LlmProviderPort {
  return {
    providerId: 'missing-provider',
    async generateText() {
      throw new Error('No LLM provider configured');
    },
  };
}
