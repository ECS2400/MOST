import type { MediationTurnV2Envelope } from '@/services/mediationTurnV2.types';

export function isWaitingForPartner(envelope: MediationTurnV2Envelope): boolean {
  if (envelope.processing) return false;
  if (envelope.content.status === 'failed') return false;

  const partnerStatus = envelope.content.partnerStatus;
  if (partnerStatus === 'waiting') {
    const answered = envelope.actions.every((action) => action.disabled === true);
    return answered;
  }

  const primary = envelope.actions.find(
    (action) => action.type === 'CONTINUE' || action.type === 'FINISH' || action.type === 'VOTE'
  );
  return primary?.disabled === true;
}

export function shouldReloadMediationSession(
  row: { session_version?: number },
  lastSessionVersion: number | null
): boolean {
  const version =
    typeof row.session_version === 'number' ? row.session_version : null;
  if (
    version != null &&
    lastSessionVersion != null &&
    version <= lastSessionVersion
  ) {
    return false;
  }
  return true;
}

export type LoadSessionCoordinatorState = {
  loadInFlight: { current: boolean };
  reloadPending: { current: boolean };
};

export function createLoadSessionCoordinator(
  loadSession: () => Promise<void>,
  state: LoadSessionCoordinatorState
): { requestLoad: () => void; runLoad: () => Promise<void> } {
  async function runLoad(): Promise<void> {
    if (state.loadInFlight.current) {
      state.reloadPending.current = true;
      return;
    }

    state.loadInFlight.current = true;
    try {
      await loadSession();
    } finally {
      state.loadInFlight.current = false;
      if (state.reloadPending.current) {
        state.reloadPending.current = false;
        await runLoad();
      }
    }
  }

  function requestLoad(): void {
    if (state.loadInFlight.current) {
      state.reloadPending.current = true;
      return;
    }
    void runLoad();
  }

  return { requestLoad, runLoad };
}
