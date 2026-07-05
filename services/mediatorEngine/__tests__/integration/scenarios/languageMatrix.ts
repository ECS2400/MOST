import type { MediatorLang, MediatorRuntimeInput } from '@/types/mediator';
import { SUPPORTED_MEDIATOR_LANGS } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import { createIntegrationInput } from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const LANGUAGE_INSTRUCTION: Record<MediatorLang, string> = {
  pl: 'Write the mediator response in Polish.',
  en: 'Write the mediator response in English.',
  es: 'Write the mediator response in Spanish.',
  it: 'Write the mediator response in Italian.',
  de: 'Write the mediator response in German.',
  fr: 'Write the mediator response in French.',
};

export const languageMatrixInputs: MediatorRuntimeInput[] = SUPPORTED_MEDIATOR_LANGS.map(
  (language) => createIntegrationInput({ language })
);

export { SUPPORTED_MEDIATOR_LANGS };
