import type { MediatorRuntimeInput } from '@/types/mediator';
import { createIntegrationInput } from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const normalConversationInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
});
