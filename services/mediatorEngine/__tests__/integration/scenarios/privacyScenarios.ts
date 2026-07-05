import type { MediatorRuntimeInput } from '@/types/mediator';
import {
  createIntegrationInput,
  createIntegrationTurnInput,
  PRIVATE_MARKERS,
} from '@/services/mediatorEngine/__tests__/integration/fixtures';

export const privacyInput: MediatorRuntimeInput = createIntegrationInput({
  language: 'en',
  turnInput: createIntegrationTurnInput({
    mediationId: PRIVATE_MARKERS.mediationId,
    sessionId: PRIVATE_MARKERS.sessionId,
    transcriptDelta: [
      {
        id: PRIVATE_MARKERS.messageId,
        authorRole: 'partner',
        content: `Reach me at ${PRIVATE_MARKERS.email} or ${PRIVATE_MARKERS.phone} about our conflict.`,
        turnNumber: 3,
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ],
  }),
});

export { PRIVATE_MARKERS };
