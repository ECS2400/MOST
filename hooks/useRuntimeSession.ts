import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMediationRuntimeSession } from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export { hasRuntimeSession };

function logRuntimeSessionLoaded(session: RuntimeSession): void {
  if (!__DEV__) return;
  console.log('[RuntimeSession] loaded', {
    stage: session.session.stage,
    currentGoal: session.session.currentGoal,
    completionEstimate: session.progress.completionEstimate,
    nextBeat: session.decision.nextBeat,
  });
}

/**
 * Read-only RuntimeSession mirror for live mediation UI (Phase UI-B.3c.1).
 *
 * Does not drive flow — only loads and exposes the last persisted contract.
 */
export function useRuntimeSession(mediationId: string | undefined) {
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession | null>(null);
  const runtimeSessionRef = useRef<RuntimeSession | null>(null);
  runtimeSessionRef.current = runtimeSession;

  useEffect(() => {
    setRuntimeSession(null);
    runtimeSessionRef.current = null;
  }, [mediationId]);

  const getCurrentRuntimeSession = useCallback((): RuntimeSession | null => {
    return runtimeSessionRef.current;
  }, []);

  const refreshRuntimeSession = useCallback(async (): Promise<RuntimeSession | null> => {
    if (!mediationId) {
      setRuntimeSession(null);
      runtimeSessionRef.current = null;
      return null;
    }

    try {
      const loaded = await loadMediationRuntimeSession(mediationId);
      setRuntimeSession(loaded);
      runtimeSessionRef.current = loaded;
      if (loaded) {
        logRuntimeSessionLoaded(loaded);
      }
      return loaded;
    } catch {
      return runtimeSessionRef.current;
    }
  }, [mediationId]);

  return {
    runtimeSession,
    refreshRuntimeSession,
    getCurrentRuntimeSession,
    hasRuntimeSession: useCallback(
      () => hasRuntimeSession(runtimeSessionRef.current),
      []
    ),
  };
}
