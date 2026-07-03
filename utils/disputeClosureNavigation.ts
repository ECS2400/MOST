import type { Router } from 'expo-router';

export interface DisputeClosureNavParams {
  mode: 'solo' | 'live';
  mediationId?: string;
  messageCount?: number;
  phase?: number;
  outcome?: 'resolved' | 'unresolved_but_closed';
}

/** Nawigacja do ankiety zamknięcia — replace, żeby odmontować ekran live. */
export function navigateToDisputeClosure(
  router: Pick<Router, 'push' | 'replace'>,
  params: DisputeClosureNavParams
): void {
  const navParams = {
    mode: params.mode,
    ...(params.mediationId ? { mediationId: params.mediationId } : {}),
    ...(params.messageCount != null ? { messageCount: String(params.messageCount) } : {}),
    ...(params.phase != null ? { phase: String(params.phase) } : {}),
    ...(params.outcome ? { outcome: params.outcome } : {}),
  };

  router.replace({
    pathname: '/mediation/closure',
    params: navParams,
  });
}
