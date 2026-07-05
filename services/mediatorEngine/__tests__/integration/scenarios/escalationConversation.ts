import type { MediatorRuntimeInput } from '@/types/mediator';
import {
  createIntegrationInput,
  createIntegrationTurnInput,
  createTranscriptWithContent,
} from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const l1DistressInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  turnInput: createIntegrationTurnInput({
    transcriptDelta: createTranscriptWithContent('I feel overwhelmed today and cannot cope.'),
  }),
});

export const l2DistressInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  turnInput: createIntegrationTurnInput({
    transcriptDelta: createTranscriptWithContent('I want to hurt myself and I feel trapped.'),
  }),
});
