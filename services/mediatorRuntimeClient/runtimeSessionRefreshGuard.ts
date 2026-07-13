export interface RuntimeSessionRefreshCommitParams {
  requestId: number;
  latestRequestId: number;
  mounted: boolean;
  activeMediationId: string;
  currentMediationId: string | undefined;
}

/** Only the latest in-flight refresh for the active mediation may commit React state. */
export function shouldCommitRuntimeSessionRefresh(
  params: RuntimeSessionRefreshCommitParams
): boolean {
  if (!params.mounted) return false;
  if (params.requestId !== params.latestRequestId) return false;
  if (params.currentMediationId !== params.activeMediationId) return false;
  return true;
}

/** Session progress poll should not reload runtime on every tick — only when progress changes. */
export function shouldRefreshRuntimeSessionOnSessionPoll(
  previousProgress: number | null,
  nextProgress: number
): boolean {
  return previousProgress !== null && previousProgress !== nextProgress;
}

/** Silent message sync reloads runtime only when remote messages actually changed. */
export function shouldRefreshRuntimeSessionOnSilentSync(hasNewMessages: boolean): boolean {
  return hasNewMessages;
}

export type LiveRuntimeDevStatus = 'ok' | 'unavailable' | 'failed';

export function resolveLiveRuntimeDevStatus(params: {
  runtimeFailed: boolean;
  hasValidRuntimeSession: boolean;
}): LiveRuntimeDevStatus {
  if (params.runtimeFailed) return 'failed';
  if (!params.hasValidRuntimeSession) return 'unavailable';
  return 'ok';
}

export function liveRuntimeDevStatusLabel(status: LiveRuntimeDevStatus): string {
  switch (status) {
    case 'failed':
      return 'Runtime Failed';
    case 'ok':
      return 'Runtime OK';
    default:
      return 'Runtime Unavailable';
  }
}
