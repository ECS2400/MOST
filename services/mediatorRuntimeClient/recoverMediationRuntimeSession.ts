import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import type { LoadedMediationRuntimeState } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import {
  recomposeRuntimeSessionFromPersistedState,
  syncSessionMemoryFromMessagesForRecovery,
} from '@/services/mediatorRuntimeClient/recomposePersistedRuntimeSession';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { prepareSupabaseRequest, supabase } from '@/services/supabase';

export interface RecoverMediationRuntimeSessionInput {
  mediationId: string;
  loaded: LoadedMediationRuntimeState;
  messages?: ParticipantReplyMessage[];
  hostUserId?: string;
  partnerUserIds?: string[];
  role: 'host' | 'partner' | 'unknown';
}

export interface RecoverMediationRuntimeSessionResult {
  recovered: boolean;
  runtimeSession: RuntimeSession | null;
  reason:
    | 'already_present'
    | 'partner_waits_for_host'
    | 'missing_state'
    | 'recompose_failed'
    | 'persist_failed'
    | 'recovered';
}

/** Host-only recovery when mediator_runtime_session is missing but state/memory exist. */
export async function recoverMediationRuntimeSession(
  input: RecoverMediationRuntimeSessionInput
): Promise<RecoverMediationRuntimeSessionResult> {
  if (hasRuntimeSession(input.loaded.runtimeSession)) {
    return {
      recovered: false,
      runtimeSession: input.loaded.runtimeSession,
      reason: 'already_present',
    };
  }

  if (input.role !== 'host') {
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'partner_waits_for_host',
    };
  }

  if (!input.loaded.mediationState || !input.loaded.sessionMemory) {
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'missing_state',
    };
  }

  let sessionMemory = input.loaded.sessionMemory;
  if (
    input.messages &&
    input.hostUserId &&
    input.partnerUserIds &&
    input.partnerUserIds.length > 0
  ) {
    sessionMemory = syncSessionMemoryFromMessagesForRecovery(
      sessionMemory,
      input.messages,
      input.hostUserId,
      input.partnerUserIds
    );
  }

  const runtimeSession = recomposeRuntimeSessionFromPersistedState({
    mediationState: input.loaded.mediationState,
    sessionMemory,
  });

  if (!runtimeSession) {
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'recompose_failed',
    };
  }

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
      return {
        recovered: false,
        runtimeSession: null,
        reason: 'persist_failed',
      };
    }
  } catch {
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'persist_failed',
    };
  }

  return {
    recovered: true,
    runtimeSession,
    reason: 'recovered',
  };
}
