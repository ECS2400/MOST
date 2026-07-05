import type {
  GenerateMediatorReplyInput,
  MediatorLang,
  PromptComposerOutput,
  SafetyLevel,
} from '@/types/mediator';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import {
  createL3SafetyInput,
  createPromptComposerInput,
  createRichPipelineInput,
} from '@/services/mediatorEngine/__tests__/promptComposer/fixtures';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import type { LlmProviderPort } from '@/types/mediator';

export function createPromptOutput(language: MediatorLang = 'en'): PromptComposerOutput {
  return composePrompt(createRichPipelineInput(language));
}

export function createL3PromptOutput(language: MediatorLang = 'en'): PromptComposerOutput {
  return composePrompt(createPromptComposerInput({ ...createL3SafetyInput(), language }));
}

export function createGenerateInput(
  overrides: Partial<GenerateMediatorReplyInput> = {}
): GenerateMediatorReplyInput {
  const language = overrides.language ?? 'en';
  const safetyLevel = overrides.safetyLevel ?? 'none';

  return {
    promptComposerOutput: overrides.promptComposerOutput ?? createPromptOutput(language),
    provider: overrides.provider ?? createFakeLlmProvider({ language }),
    language,
    safetyLevel,
    turnNumber: overrides.turnNumber ?? 3,
    ...overrides,
  };
}

export function createGenerateInputWithProvider(
  provider: LlmProviderPort,
  options: {
    language?: MediatorLang;
    safetyLevel?: SafetyLevel;
    promptComposerOutput?: PromptComposerOutput;
  } = {}
): GenerateMediatorReplyInput {
  const language = options.language ?? 'en';
  return {
    promptComposerOutput: options.promptComposerOutput ?? createPromptOutput(language),
    provider,
    language,
    safetyLevel: options.safetyLevel ?? 'none',
    turnNumber: 3,
  };
}

export { createFakeLlmProvider, createDeterministicStubProvider };
