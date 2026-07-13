import { prepareSupabaseRequest, supabase } from '@/services/supabase';
import {
  parseLoadedMediationRuntimeRow,
  type LoadedMediationRuntimeState,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import {
  buildRuntimeSessionLoadDiagnostics,
  logRuntimeSessionLoadDiagnostics,
  resolveRuntimeSessionFromRow,
  type RuntimeSessionLoadDiagnostics,
  type RuntimeSessionParticipantRole,
} from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface LoadMediationRuntimeSessionResult {
  runtimeSession: RuntimeSession | null;
  diagnostics: RuntimeSessionLoadDiagnostics;
  devDiagnostics?: import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics | null;
}

export interface LoadMediationRuntimeSessionOptions {
  role?: RuntimeSessionParticipantRole;
  logDiagnostics?: boolean;
}

/** Loads v2.3 runtime state persisted on mediations (Phase UI-B.1b + UI-B.3b.4). */
export async function loadMediationRuntimeState(
  mediationId: string,
  options: LoadMediationRuntimeSessionOptions = {}
): Promise<LoadedMediationRuntimeState> {
  const result = await loadMediationRuntimeSessionWithDiagnostics(mediationId, options);
  return {
    mediationState: result.mediationState,
    sessionMemory: result.sessionMemory,
    runtimeSession: result.runtimeSession,
  };
}

/** Loads runtime session with sanitized DEV diagnostics — no transcript content. */
export async function loadMediationRuntimeSessionWithDiagnostics(
  mediationId: string,
  options: LoadMediationRuntimeSessionOptions = {}
): Promise<LoadedMediationRuntimeState & { diagnostics: RuntimeSessionLoadDiagnostics }> {
  const role = options.role ?? 'unknown';
  const emptyDiagnostics = buildRuntimeSessionLoadDiagnostics({
    role,
    mediationId,
    loadAttempted: false,
    rowFound: false,
    rawRuntimeSession: null,
    supabaseErrorCode: null,
  });

  if (!mediationId.trim()) {
    if (options.logDiagnostics !== false) {
      logRuntimeSessionLoadDiagnostics(emptyDiagnostics);
    }
    return {
      mediationState: null,
      sessionMemory: null,
      runtimeSession: null,
      diagnostics: emptyDiagnostics,
    };
  }

  try {
    await prepareSupabaseRequest();
    const { data, error } = await supabase
      .from('mediations')
      .select('mediation_state, session_memory, mediator_runtime_session, mediator_runtime_metadata')
      .eq('id', mediationId)
      .maybeSingle();

    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role,
      mediationId,
      loadAttempted: true,
      rowFound: Boolean(data),
      rawRuntimeSession: data?.mediator_runtime_session ?? null,
      rawRuntimeMetadata: data?.mediator_runtime_metadata ?? null,
      supabaseErrorCode: error?.code ?? null,
      supabaseErrorMessage: error?.message ?? null,
    });

    if (options.logDiagnostics !== false) {
      logRuntimeSessionLoadDiagnostics(diagnostics);
    }

    if (error || !data) {
      return {
        mediationState: null,
        sessionMemory: null,
        runtimeSession: null,
        diagnostics,
        devDiagnostics: null,
      };
    }

    const parsed = parseLoadedMediationRuntimeRow(data);
    const meta = (data as { mediator_runtime_metadata?: unknown }).mediator_runtime_metadata as
      | Record<string, unknown>
      | null
      | undefined;
    const devDiagnostics =
      __DEV__ && meta && typeof meta === 'object' && 'devDiagnostics' in meta
        ? ((meta as Record<string, unknown>).devDiagnostics as
            | import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics
            | null
            | undefined) ?? null
        : null;
    return {
      ...parsed,
      runtimeSession: resolveRuntimeSessionFromRow(data.mediator_runtime_session) ?? parsed.runtimeSession,
      diagnostics,
      devDiagnostics,
    };
  } catch (error) {
    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role,
      mediationId,
      loadAttempted: true,
      rowFound: false,
      rawRuntimeSession: null,
      supabaseErrorCode:
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? 'unknown')
          : 'unknown',
    });
    if (options.logDiagnostics !== false) {
      logRuntimeSessionLoadDiagnostics(diagnostics);
    }
    return {
      mediationState: null,
      sessionMemory: null,
      runtimeSession: null,
      diagnostics,
      devDiagnostics: null,
    };
  }
}

/** Loads the last persisted RuntimeSession for a mediation, if any. */
export async function loadMediationRuntimeSession(
  mediationId: string,
  options: LoadMediationRuntimeSessionOptions = {}
): Promise<RuntimeSession | null> {
  const loaded = await loadMediationRuntimeSessionWithDiagnostics(mediationId, options);
  return loaded.runtimeSession;
}
