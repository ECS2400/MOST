import type { MediationState, StateAnalyzerInput, TranscriptMessage } from '@/types/mediator';
import { skeletonConfidence } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createInitialMediationState } from '@/services/mediatorEngine/stateAnalyzer/factory/createInitialMediationState';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';

export function createStateAnalyzerInput(
  overrides: Partial<StateAnalyzerInput> = {}
): StateAnalyzerInput {
  return {
    mediationState: null,
    transcriptDelta: [],
    turnNumber: 1,
    ...overrides,
  };
}

export function createExistingMediationState(
  overrides: Partial<MediationState> = {}
): MediationState {
  return {
    ...createBaselineMediationState(),
    meta: {
      ...createBaselineMediationState().meta,
      currentTurnNumber: 3,
      lastUpdatedAt: '2026-07-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

export function createTranscriptDelta(
  messages: Partial<TranscriptMessage>[]
): TranscriptMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? `msg-${index + 1}`,
    authorRole: message.authorRole ?? 'host',
    content: message.content ?? 'placeholder',
    turnNumber: message.turnNumber ?? 1,
    createdAt: message.createdAt ?? '2026-07-05T00:00:00.000Z',
  }));
}

export function createStateWithDecayableLoad(confidence: number): MediationState {
  const host = skeletonConfidence(50);
  host.confidence = confidence;
  host.stale = false;
  return createExistingMediationState({
    meta: {
      ...createExistingMediationState().meta,
      currentTurnNumber: 1,
    },
    load: {
      ...createExistingMediationState().load,
      host,
    },
  });
}

export { createInitialMediationState };
