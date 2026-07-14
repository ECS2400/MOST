import type { LoadedMediationRuntimeState } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import {
  recomposeRuntimeSessionFromPersistedState,
  syncSessionMemoryFromMessagesForRecovery,
} from '@/services/mediatorRuntimeClient/recomposePersistedRuntimeSession';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { logRuntimeRecoveryResult, type RuntimeRecoveryResultDiagnostics } from '@/services/mediatorRuntimeClient/runtimeRecoveryDevLog';
import { resolveRuntimeSessionFromRow } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import type { SessionMemory } from '@/types/mediator/sessionMemory';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

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
    | 'missing_mediation_state'
    | 'missing_session_memory'
    | 'missing_state'
    | 'recompose_failed'
    | 'persist_failed'
    | 'persist_shape_invalid'
    | 'bootstrap_required'
    | 'recovered';
}

export interface PersistRecoveredRuntimeSessionInput {
  mediationId: string;
  sessionMemory: SessionMemory;
  runtimeSession: RuntimeSession;
}

export interface PersistRecoveredRuntimeSessionResult {
  rawRuntimeSession: unknown;
  error: { code: string; message: string } | null;
}

export type PersistRecoveredRuntimeSession = (
  input: PersistRecoveredRuntimeSessionInput
) => Promise<PersistRecoveredRuntimeSessionResult>;

function logRecoveryResult(diagnostics: Parameters<typeof logRuntimeRecoveryResult>[0]): void {
  logRuntimeRecoveryResult(diagnostics);
}

function buildResultLogBase(
  input: RecoverMediationRuntimeSessionInput
): Pick<
  RuntimeRecoveryResultDiagnostics,
  'role' | 'loadedRuntimeSessionPresent' | 'mediationStatePresent' | 'sessionMemoryPresent'
> {
  return {
    role: input.role,
    loadedRuntimeSessionPresent: hasRuntimeSession(input.loaded.runtimeSession),
    mediationStatePresent: input.loaded.mediationState != null,
    sessionMemoryPresent: input.loaded.sessionMemory != null,
  };
}

/** Host-only recovery when mediator_runtime_session is missing but state/memory exist. */
export async function recoverMediationRuntimeSessionCore(
  input: RecoverMediationRuntimeSessionInput,
  persist: PersistRecoveredRuntimeSession
): Promise<RecoverMediationRuntimeSessionResult> {
  const base = buildResultLogBase(input);
  const emptyPersist = {
    recomposeSucceeded: false,
    persistStarted: false,
    persistSucceeded: false,
    persistErrorCode: null,
    persistErrorMessage: null,
    refreshedAfterPersist: false,
    loadedAfterPersist: false,
    shapeValidAfterPersist: false,
  };

  if (hasRuntimeSession(input.loaded.runtimeSession)) {
    logRecoveryResult({
      ...base,
      ...emptyPersist,
      shapeValidAfterPersist: isRuntimeSessionShape(input.loaded.runtimeSession),
    });
    return {
      recovered: false,
      runtimeSession: input.loaded.runtimeSession,
      reason: 'already_present',
    };
  }

  if (input.role !== 'host') {
    logRecoveryResult({ ...base, ...emptyPersist });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'partner_waits_for_host',
    };
  }

  if (
    !input.loaded.mediationState &&
    !input.loaded.sessionMemory &&
    !hasRuntimeSession(input.loaded.runtimeSession)
  ) {
    logRecoveryResult({ ...base, ...emptyPersist });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'bootstrap_required',
    };
  }

  if (!input.loaded.mediationState) {
    logRecoveryResult({ ...base, ...emptyPersist });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'missing_mediation_state',
    };
  }

  if (!input.loaded.sessionMemory) {
    logRecoveryResult({ ...base, ...emptyPersist });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'missing_session_memory',
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
    logRecoveryResult({ ...base, ...emptyPersist });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'recompose_failed',
    };
  }

  try {
    const { rawRuntimeSession, error } = await persist({
      mediationId: input.mediationId,
      sessionMemory,
      runtimeSession,
    });

    if (error) {
      logRecoveryResult({
        ...base,
        recomposeSucceeded: true,
        persistStarted: true,
        persistSucceeded: false,
        persistErrorCode: error.code,
        persistErrorMessage: error.message,
        refreshedAfterPersist: false,
        loadedAfterPersist: false,
        shapeValidAfterPersist: false,
      });
      return {
        recovered: false,
        runtimeSession: null,
        reason: 'persist_failed',
      };
    }

    const persistedSession = resolveRuntimeSessionFromRow(rawRuntimeSession);
    const shapeValidAfterPersist = isRuntimeSessionShape(persistedSession);

    if (!persistedSession || !shapeValidAfterPersist) {
      logRecoveryResult({
        ...base,
        recomposeSucceeded: true,
        persistStarted: true,
        persistSucceeded: false,
        persistErrorCode: 'persist_shape_invalid',
        persistErrorMessage: 'UPDATE returned row without valid mediator_runtime_session',
        refreshedAfterPersist: false,
        loadedAfterPersist: persistedSession != null,
        shapeValidAfterPersist: false,
      });
      return {
        recovered: false,
        runtimeSession: null,
        reason: 'persist_shape_invalid',
      };
    }

    logRecoveryResult({
      ...base,
      recomposeSucceeded: true,
      persistStarted: true,
      persistSucceeded: true,
      persistErrorCode: null,
      persistErrorMessage: null,
      refreshedAfterPersist: false,
      loadedAfterPersist: true,
      shapeValidAfterPersist: true,
    });

    return {
      recovered: true,
      runtimeSession: persistedSession,
      reason: 'recovered',
    };
  } catch (error) {
    logRecoveryResult({
      ...base,
      recomposeSucceeded: true,
      persistStarted: true,
      persistSucceeded: false,
      persistErrorCode:
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? 'unknown')
          : 'unknown',
      persistErrorMessage:
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? 'unknown')
          : 'unknown',
      refreshedAfterPersist: false,
      loadedAfterPersist: false,
      shapeValidAfterPersist: false,
    });
    return {
      recovered: false,
      runtimeSession: null,
      reason: 'persist_failed',
    };
  }
}
