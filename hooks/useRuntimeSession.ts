import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMediationRuntimeSessionWithDiagnostics } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import { shouldCommitRuntimeSessionRefresh } from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import type { RuntimeSessionParticipantRole } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { normalizeRouteParam } from '@/utils/normalizeRouteParam';

export { hasRuntimeSession };

export interface UseRuntimeSessionOptions {
  role?: RuntimeSessionParticipantRole;
}

function logRuntimeSessionLoaded(
  mediationId: string,
  role: RuntimeSessionParticipantRole,
  session: RuntimeSession
): void {
  if (!__DEV__) return;
  console.log('[RuntimeSession] loaded', {
    mediationId,
    role,
    stage: session.session.stage,
    currentGoal: session.session.currentGoal,
    completionEstimate: session.progress.completionEstimate,
    nextBeat: session.decision.nextBeat,
    pending: session.pending.awaiting,
  });
}

/**
 * Read-only RuntimeSession mirror for live mediation UI (Phase UI-B.3c.1).
 *
 * Does not drive flow — only loads and exposes the last persisted contract.
 */
export function useRuntimeSession(
  mediationIdInput: string | string[] | undefined,
  options: UseRuntimeSessionOptions = {}
) {
  const mediationId = normalizeRouteParam(mediationIdInput);
  const role = options.role ?? 'unknown';
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession | null>(null);
  const [devDiagnostics, setDevDiagnostics] = useState<
    import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics | null
  >(null);
  const runtimeSessionRef = useRef<RuntimeSession | null>(null);
  const mediationIdRef = useRef<string | undefined>(mediationId);
  const refreshRequestIdRef = useRef(0);
  const mountedRef = useRef(false);
  mediationIdRef.current = mediationId;
  runtimeSessionRef.current = runtimeSession;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      refreshRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    refreshRequestIdRef.current += 1;
    setRuntimeSession(null);
    runtimeSessionRef.current = null;
    setDevDiagnostics(null);
  }, [mediationId]);

  const refreshRuntimeSession = useCallback(async (): Promise<RuntimeSession | null> => {
    const activeMediationId = mediationIdRef.current;
    if (!activeMediationId) {
      if (!mountedRef.current) return null;
      setRuntimeSession(null);
      runtimeSessionRef.current = null;
      return null;
    }

    const requestId = ++refreshRequestIdRef.current;

    try {
      const loaded = await loadMediationRuntimeSessionWithDiagnostics(activeMediationId, {
        role,
        logDiagnostics: true,
      });

      if (
        !shouldCommitRuntimeSessionRefresh({
          requestId,
          latestRequestId: refreshRequestIdRef.current,
          mounted: mountedRef.current,
          activeMediationId,
          currentMediationId: mediationIdRef.current,
        })
      ) {
        return runtimeSessionRef.current;
      }

      setRuntimeSession(loaded.runtimeSession);
      runtimeSessionRef.current = loaded.runtimeSession;
      setDevDiagnostics(loaded.devDiagnostics ?? null);
      if (loaded.runtimeSession) {
        logRuntimeSessionLoaded(activeMediationId, role, loaded.runtimeSession);
      }
      return loaded.runtimeSession;
    } catch {
      return runtimeSessionRef.current;
    }
  }, [role]);

  useEffect(() => {
    if (!mediationId) return;
    void refreshRuntimeSession();
  }, [mediationId, refreshRuntimeSession]);

  const getCurrentRuntimeSession = useCallback((): RuntimeSession | null => {
    return runtimeSessionRef.current;
  }, []);

  return {
    runtimeSession,
    devDiagnostics,
    refreshRuntimeSession,
    getCurrentRuntimeSession,
    hasRuntimeSession: useCallback(
      () => hasRuntimeSession(runtimeSessionRef.current),
      []
    ),
    mediationId,
  };
}
