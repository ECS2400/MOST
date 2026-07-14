import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMediationRuntimeSessionWithDiagnostics } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import { logRuntimeRecoveryBlocked, logRuntimeRecoveryDev } from '@/services/mediatorRuntimeClient/runtimeRecoveryDevLog';
import { shouldCommitRuntimeSessionRefresh } from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import type {
  RuntimeSessionLoadDiagnostics,
  RuntimeSessionParticipantRole,
} from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';

export { hasRuntimeSession };
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { normalizeRouteParam } from '@/utils/normalizeRouteParam';

export interface UseRuntimeSessionResult {
  runtimeSession: RuntimeSession | null;
  devDiagnostics: import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics | null;
  runtimeSessionLoadSettled: boolean;
  loadDiagnostics: RuntimeSessionLoadDiagnostics | null;
  refreshRuntimeSession: () => Promise<RuntimeSession | null>;
  getCurrentRuntimeSession: () => RuntimeSession | null;
  hasRuntimeSession: () => boolean;
  mediationId: string | undefined;
  recoveryClickCount: number;
  bumpRecoveryClickCount: () => void;
}

export interface UseRuntimeSessionOptions {
  role?: RuntimeSessionParticipantRole;
  userId?: string | null;
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
  const userId = options.userId ?? null;
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession | null>(null);
  const [devDiagnostics, setDevDiagnostics] = useState<
    import('@/services/mediatorEngine/edge/types').MediatorRuntimeEdgeDevDiagnostics | null
  >(null);
  const [loadDiagnostics, setLoadDiagnostics] = useState<RuntimeSessionLoadDiagnostics | null>(
    null
  );
  const [runtimeSessionLoadSettled, setRuntimeSessionLoadSettled] = useState(false);
  const [recoveryClickCount, setRecoveryClickCount] = useState(0);
  const runtimeSessionRef = useRef<RuntimeSession | null>(null);
  const mediationIdRef = useRef<string | undefined>(mediationId);
  const roleRef = useRef<RuntimeSessionParticipantRole>(role);
  const refreshRequestIdRef = useRef(0);
  const recoveryClickCountRef = useRef(0);
  const mountedRef = useRef(false);
  const userIdRef = useRef(userId);
  mediationIdRef.current = mediationId;
  runtimeSessionRef.current = runtimeSession;
  userIdRef.current = userId;
  roleRef.current = role;

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
    setLoadDiagnostics(null);
    setRuntimeSessionLoadSettled(false);
    setRecoveryClickCount(0);
    recoveryClickCountRef.current = 0;
  }, [mediationId]);

  const refreshRuntimeSession = useCallback(async (): Promise<RuntimeSession | null> => {
    const activeMediationId = mediationIdRef.current;
    const activeRole = roleRef.current;
    if (!activeMediationId) {
      logRuntimeRecoveryBlocked({
        reason: 'mediation_id_missing',
        runtimeParticipantRole: activeRole,
        isCurrentUserHost: activeRole === 'host',
        mediationId: null,
        loadSettled: false,
        runtimeUnavailable: false,
        attempted: false,
        inFlight: false,
      });
      if (!mountedRef.current) return null;
      setRuntimeSession(null);
      runtimeSessionRef.current = null;
      return null;
    }

    const requestId = ++refreshRequestIdRef.current;

    try {
      const loaded = await loadMediationRuntimeSessionWithDiagnostics(activeMediationId, {
        role: activeRole,
        logDiagnostics: true,
      });

      const commitAllowed = shouldCommitRuntimeSessionRefresh({
        requestId,
        latestRequestId: refreshRequestIdRef.current,
        mounted: mountedRef.current,
        activeMediationId,
        currentMediationId: mediationIdRef.current,
      });

      logRuntimeRecoveryDev({
        mediationId: activeMediationId,
        requestId,
        userId: userIdRef.current,
        role: activeRole,
        rowFound: loaded.diagnostics.rowFound,
        supabaseErrorCode: loaded.diagnostics.supabaseErrorCode,
        supabaseErrorMessage: loaded.diagnostics.supabaseErrorMessage,
        rawRuntimeSessionPresent: loaded.diagnostics.runtimeSessionPresent,
        runtimeMetadataPresent: loaded.diagnostics.runtimeMetadataPresent,
        shapeValid: loaded.diagnostics.shapeValid,
        rejectedShapeField: loaded.diagnostics.rejectedShapeField,
        commitAllowed,
        staleRequest: !commitAllowed,
        mounted: mountedRef.current,
        recoveryClickCount: recoveryClickCountRef.current,
      });

      if (!commitAllowed) {
        logRuntimeRecoveryBlocked({
          reason: 'stale_request_guard',
          runtimeParticipantRole: activeRole,
          isCurrentUserHost: activeRole === 'host',
          mediationId: activeMediationId,
          loadSettled: true,
          runtimeUnavailable: !hasRuntimeSession(loaded.runtimeSession),
          attempted: false,
          inFlight: false,
        });
        return runtimeSessionRef.current;
      }

      setRuntimeSession(loaded.runtimeSession);
      runtimeSessionRef.current = loaded.runtimeSession;
      setDevDiagnostics(loaded.devDiagnostics ?? null);
      setLoadDiagnostics(loaded.diagnostics ?? null);
      setRuntimeSessionLoadSettled(true);
      if (loaded.runtimeSession) {
        logRuntimeSessionLoaded(activeMediationId, activeRole, loaded.runtimeSession);
      }
      return loaded.runtimeSession;
    } catch {
      setRuntimeSessionLoadSettled(true);
      return runtimeSessionRef.current;
    }
  }, []);

  const bumpRecoveryClickCount = useCallback(() => {
    recoveryClickCountRef.current += 1;
    setRecoveryClickCount(recoveryClickCountRef.current);
  }, []);

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
    loadDiagnostics,
    runtimeSessionLoadSettled,
    recoveryClickCount,
    bumpRecoveryClickCount,
    refreshRuntimeSession,
    getCurrentRuntimeSession,
    hasRuntimeSession: useCallback(
      () => hasRuntimeSession(runtimeSessionRef.current),
      []
    ),
    mediationId,
  };
}
