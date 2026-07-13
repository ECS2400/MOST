import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import {
  applyDerivedParticipantRepliesToFlowControl,
  bothParticipantRepliesSatisfied,
  patchRuntimeSessionAfterBothReplies,
} from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import { composeRuntimeSession } from '@/services/mediatorEngine/runtimeSession';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import type { Intervention, MediationState, SessionMemory } from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function resolveTurnNumber(state: MediationState, sessionMemory: SessionMemory): number {
  const fromState = state.meta?.turnNumber;
  if (typeof fromState === 'number' && fromState > 0) {
    return fromState;
  }

  const history = sessionMemory.interventionHistory;
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (typeof last?.turnNumber === 'number' && last.turnNumber > 0) {
      return last.turnNumber;
    }
  }

  return 1;
}

function buildRecoveryIntervention(
  mediationState: MediationState,
  turnNumber: number
): Intervention {
  const goal = mediationState.currentGoal;
  const strategy = mediationState.activeStrategy?.primary ?? 'validate_emotions';

  return {
    id: `runtime-recovery-${turnNumber}`,
    type: 'recover_acknowledge',
    target: 'both',
    visibility: 'public',
    content: {
      primaryMessage: '',
    },
    goal,
    intent: 'help_name_emotion',
    strategy,
    rationale: 'runtime_session_recovery',
    expectedEffect: {
      id: `recovery-effect-${turnNumber}`,
      description: 'Restore runtime session contract without new chat output',
      observableSignals: [],
      targetParticipant: 'both',
      verificationMethod: 'next_message',
      successCriteria: {
        type: 'check_confirmed',
        threshold: 1,
        confidenceRequired: 50,
      },
      timeHorizon: 1,
    },
    libraryPatternId: null,
    signature: `runtime-recovery-${turnNumber}`,
    generatedAt: new Date().toISOString(),
  };
}

export function syncSessionMemoryFromMessagesForRecovery(
  sessionMemory: SessionMemory,
  messages: ParticipantReplyMessage[],
  hostUserId: string,
  partnerUserIds: string[]
): SessionMemory {
  const derived = deriveParticipantReplyStateFromMessages({
    messages,
    hostUserId,
    partnerUserIds,
  });

  const flowControl = sessionMemory.runtimeFlowControl ?? createDefaultRuntimeFlowControl();
  const applyResult = applyDerivedParticipantRepliesToFlowControl(
    flowControl,
    sessionMemory,
    derived
  );

  if (!applyResult.changed) {
    return sessionMemory;
  }

  return {
    ...sessionMemory,
    runtimeFlowControl: applyResult.flowControl,
  };
}

/** Recomposes runtimeSession from persisted engine state without new AI output. */
export function recomposeRuntimeSessionFromPersistedState(params: {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
}): RuntimeSession | null {
  try {
    const turnNumber = resolveTurnNumber(params.mediationState, params.sessionMemory);
    const intervention = buildRecoveryIntervention(params.mediationState, turnNumber);

    let runtimeSession = composeRuntimeSession({
      mediationState: params.mediationState,
      sessionMemory: params.sessionMemory,
      intervention,
      finalMediatorMessage: {
        text: '',
        source: 'stub',
        safetyLevel: 'none',
        language: params.mediationState.meta.language,
        turnNumber,
        accepted: true,
        validationAction: 'accept',
      },
      runtimeMetadata: {
        engineVersion: MEDIATOR_RUNTIME_ENGINE_VERSION,
        turnNumber,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
        providerId: 'runtime-recovery',
        retryCount: 0,
      },
      fallbackUsed: false,
    });

    if (
      bothParticipantRepliesSatisfied(params.sessionMemory.runtimeFlowControl?.participantReplies)
    ) {
      runtimeSession = patchRuntimeSessionAfterBothReplies(runtimeSession);
    }

    return runtimeSession;
  } catch {
    return null;
  }
}
