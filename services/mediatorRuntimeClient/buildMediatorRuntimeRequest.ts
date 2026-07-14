import type {
  MediationState,
  MediatorLang,
  OrchestrateTurnTrigger,
  RuntimeClientEvent,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';
import type { MediatorRuntimeEdgeRequest } from '@/services/mediatorEngine/edge/types';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

/** Client input for one mediator-runtime turn — mirrors Edge Function contract. */
export interface MediatorRuntimeClientInput {
  transcriptDelta: TranscriptMessage[];
  mediationState: MediationState | null;
  sessionMemory: SessionMemory | null;
  turnNumber: number;
  trigger: OrchestrateTurnTrigger;
  language: MediatorLang;
  sessionId: string;
  mediationId: string;
  engineVersion?: typeof MEDIATOR_RUNTIME_ENGINE_VERSION;
  clientEvents?: RuntimeClientEvent[];
  transcriptWindow?: TranscriptMessage[];
  participantNames?: { hostName?: string; partnerName?: string };
}

/** Builds the JSON body accepted by mediator-runtime Edge Function. */
export function buildMediatorRuntimeRequest(
  input: MediatorRuntimeClientInput
): MediatorRuntimeEdgeRequest {
  return {
    mediationId: input.mediationId,
    sessionId: input.sessionId,
    turnNumber: input.turnNumber,
    trigger: input.trigger,
    mediationState: input.mediationState,
    sessionMemory: input.sessionMemory,
    transcriptDelta: input.transcriptDelta,
    language: input.language,
    engineVersion: input.engineVersion ?? MEDIATOR_RUNTIME_ENGINE_VERSION,
    clientEvents: input.clientEvents ?? [],
    transcriptWindow: input.transcriptWindow,
    participantNames: input.participantNames,
  };
}
