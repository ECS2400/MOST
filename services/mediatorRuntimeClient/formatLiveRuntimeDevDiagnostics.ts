import type { RuntimeSession } from '@/types/mediator/runtimeSession';

/** Sanitized live runtime fields for DEV diagnostics — no message content or prompts. */
export interface LiveRuntimeDevDiagnostics {
  mediationId: string;
  runtimeStage: string;
  currentGoal: string;
  nextBeat: string;
  pendingAwaiting: string;
  proposalPhase: string;
  closureDirective: string;
  runtimeFailed: boolean;
}

const UNAVAILABLE = 'unavailable';

function fieldOrUnavailable(value: string | null | undefined): string {
  if (value == null || value === '') return UNAVAILABLE;
  return value;
}

/** Builds DEV-only runtime session diagnostics from the live runtime contract. */
export function buildLiveRuntimeDevDiagnostics(params: {
  mediationId: string | undefined;
  runtimeSession: RuntimeSession | null | undefined;
  runtimeFailed: boolean;
}): LiveRuntimeDevDiagnostics | null {
  if (!params.mediationId) {
    return null;
  }

  const session = params.runtimeSession;

  if (!session) {
    return {
      mediationId: params.mediationId,
      runtimeStage: UNAVAILABLE,
      currentGoal: UNAVAILABLE,
      nextBeat: UNAVAILABLE,
      pendingAwaiting: UNAVAILABLE,
      proposalPhase: UNAVAILABLE,
      closureDirective: UNAVAILABLE,
      runtimeFailed: params.runtimeFailed,
    };
  }

  return {
    mediationId: params.mediationId,
    runtimeStage: fieldOrUnavailable(session.session.stage),
    currentGoal: fieldOrUnavailable(session.session.currentGoal),
    nextBeat: fieldOrUnavailable(session.decision.nextBeat),
    pendingAwaiting: fieldOrUnavailable(session.pending.awaiting),
    proposalPhase: fieldOrUnavailable(session.proposal.phase),
    closureDirective: fieldOrUnavailable(session.closure.directive),
    runtimeFailed: params.runtimeFailed,
  };
}

/** Logs sanitized diagnostics in DEV — no transcript or message bodies. */
export function logLiveRuntimeDevDiagnostics(diagnostics: LiveRuntimeDevDiagnostics): void {
  if (!__DEV__) return;
  console.log('[LiveRuntime DEV]', diagnostics);
}
