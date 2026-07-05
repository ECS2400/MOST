import type { MediatorRuntimeInput } from '@/types/mediator';
import {
  createIntegrationInput,
  createIntegrationTurnInput,
  createTranscriptWithContent,
} from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const safetyL3Input: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  turnInput: createIntegrationTurnInput({
    transcriptDelta: createTranscriptWithContent('I want to kill myself tonight'),
  }),
});
