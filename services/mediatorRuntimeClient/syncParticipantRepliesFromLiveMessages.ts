import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import {
  applyDerivedParticipantRepliesToFlowControl,
  bothParticipantRepliesSatisfied,
  patchRuntimeSessionAfterBothReplies,
} from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import { buildParticipantReplyClientEventsFromMessages } from '@/services/mediatorRuntimeClient/buildParticipantReplyClientEventsFromMessages';
import {
  deriveParticipantReplyStateFromMessages,
  type ParticipantReplyDerivedState,
} from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { loadMediationRuntimeState } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import {
  logParticipantReplySyncDev,
  resolveRuntimePendingLabel,
} from '@/services/mediatorRuntimeClient/participantReplySyncDevLog';
import type { RuntimeClientEvent } from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { prepareSupabaseRequest, supabase } from '@/services/supabase';

export interface SyncParticipantRepliesFromLiveMessagesInput {
  mediationId: string;
  messages: ParticipantReplyMessage[];
  hostUserId: string;
  partnerUserIds: string[];
  currentQuestionTurn?: number | null;
  actor?: 'host' | 'partner' | 'system';
  runtimeTurnNumber?: number | null;
}

export interface SyncParticipantRepliesFromLiveMessagesResult {
  applied: boolean;
  bothSatisfied: boolean;
  runtimeSession: RuntimeSession | null;
  derived: ParticipantReplyDerivedState;
  replyClientEvents: RuntimeClientEvent[];
}

/** @deprecated Inactive — use processBothParticipantReplies for atomic reply + generate turn. */
/** Persists participantReplies from live_messages — not from a single-device ref. */
export async function syncParticipantRepliesFromLiveMessages(
  input: SyncParticipantRepliesFromLiveMessagesInput
): Promise<SyncParticipantRepliesFromLiveMessagesResult> {
  const derived = deriveParticipantReplyStateFromMessages({
    messages: input.messages,
    currentQuestionTurn: input.currentQuestionTurn ?? null,
    hostUserId: input.hostUserId,
    partnerUserIds: input.partnerUserIds,
  });

  const replyClientEvents = buildParticipantReplyClientEventsFromMessages(derived);
  const emptyResult = {
    applied: false,
    bothSatisfied: false,
    runtimeSession: null as RuntimeSession | null,
    derived,
    replyClientEvents,
  };

  if (!input.mediationId.trim()) {
    return emptyResult;
  }

  const loaded = await loadMediationRuntimeState(input.mediationId);
  const pendingBefore = resolveRuntimePendingLabel(loaded.runtimeSession);

  if (!loaded.mediationState || !loaded.sessionMemory) {
    logParticipantReplySyncDev({
      actor: input.actor ?? 'system',
      eventKinds: replyClientEvents.map((event) => event.kind),
      questionTurn: derived.questionTurn,
      runtimeTurnNumber: input.runtimeTurnNumber ?? loaded.runtimeSession?.session.turnOrdinal ?? null,
      pendingBefore,
      pendingAfter: pendingBefore,
      hostReplied: derived.hostReplied,
      partnerReplied: derived.partnerReplied,
      source: 'live_messages',
    });
    return { ...emptyResult, runtimeSession: loaded.runtimeSession };
  }

  const flowControl = loaded.sessionMemory.runtimeFlowControl ?? createDefaultRuntimeFlowControl();
  const applyResult = applyDerivedParticipantRepliesToFlowControl(
    flowControl,
    loaded.sessionMemory,
    derived
  );

  if (!applyResult.changed && !derived.bothReplied) {
    logParticipantReplySyncDev({
      actor: input.actor ?? 'system',
      eventKinds: replyClientEvents.map((event) => event.kind),
      questionTurn: derived.questionTurn,
      runtimeTurnNumber: input.runtimeTurnNumber ?? loaded.runtimeSession?.session.turnOrdinal ?? null,
      pendingBefore,
      pendingAfter: pendingBefore,
      hostReplied: derived.hostReplied,
      partnerReplied: derived.partnerReplied,
      source: 'live_messages',
    });
    return {
      applied: false,
      bothSatisfied: bothParticipantRepliesSatisfied(flowControl.participantReplies),
      runtimeSession: loaded.runtimeSession,
      derived,
      replyClientEvents,
    };
  }

  const sessionMemory = {
    ...loaded.sessionMemory,
    runtimeFlowControl: applyResult.flowControl,
  };

  const bothSatisfied = bothParticipantRepliesSatisfied(
    sessionMemory.runtimeFlowControl.participantReplies
  );

  let runtimeSession = loaded.runtimeSession;
  if (bothSatisfied && runtimeSession) {
    runtimeSession = patchRuntimeSessionAfterBothReplies(runtimeSession);
  }

  const pendingAfter = resolveRuntimePendingLabel(runtimeSession);

  try {
    await prepareSupabaseRequest();
    const { error } = await supabase
      .from('mediations')
      .update({
        session_memory: sessionMemory,
        mediator_runtime_session: runtimeSession,
        mediator_engine_version: MEDIATOR_RUNTIME_ENGINE_VERSION,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.mediationId);

    if (error) {
      console.warn('[syncParticipantRepliesFromLiveMessages] persist failed:', error.message);
      logParticipantReplySyncDev({
        actor: input.actor ?? 'system',
        eventKinds: replyClientEvents.map((event) => event.kind),
        questionTurn: derived.questionTurn,
        runtimeTurnNumber: input.runtimeTurnNumber ?? loaded.runtimeSession?.session.turnOrdinal ?? null,
        pendingBefore,
        pendingAfter: pendingBefore,
        hostReplied: derived.hostReplied,
        partnerReplied: derived.partnerReplied,
        source: 'live_messages',
      });
      return {
        applied: false,
        bothSatisfied: false,
        runtimeSession: loaded.runtimeSession,
        derived,
        replyClientEvents,
      };
    }
  } catch (error) {
    console.warn('[syncParticipantRepliesFromLiveMessages] persist failed:', String(error));
    return {
      applied: false,
      bothSatisfied: false,
      runtimeSession: loaded.runtimeSession,
      derived,
      replyClientEvents,
    };
  }

  logParticipantReplySyncDev({
    actor: input.actor ?? 'system',
    eventKinds: replyClientEvents.map((event) => event.kind),
    questionTurn: derived.questionTurn,
    runtimeTurnNumber: input.runtimeTurnNumber ?? runtimeSession?.session.turnOrdinal ?? null,
    pendingBefore,
    pendingAfter,
    hostReplied: derived.hostReplied,
    partnerReplied: derived.partnerReplied,
    source: 'live_messages',
  });

  return {
    applied: true,
    bothSatisfied,
    runtimeSession,
    derived,
    replyClientEvents,
  };
}
