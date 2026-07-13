import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import { resolveRuntimeClosureAction } from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeActionExecutionReason =
  | 'runtime_available'
  | 'runtime_unavailable'
  | 'runtime_failed'
  | 'invalid_runtime_state';

export interface RuntimeActionExecution {
  useRuntime: boolean;
  useLegacyFallback: boolean;
  reason: RuntimeActionExecutionReason;
}

export interface ResolveRuntimeActionExecutionParams {
  runtimeSession: RuntimeSession | null | undefined;
  runtimeFailed?: boolean;
  invalidRuntimeState?: boolean;
}

export type LiveRuntimeClientActionKind =
  | 'continue_session'
  | 'start_extension'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'resolve_session';

export interface LiveRuntimeClientActionPlan {
  execution: RuntimeActionExecution;
  emitClientEvent: boolean;
  callRuntimeTurn: boolean;
  legacySteps: {
    signalSessionDecision: boolean;
    signalProposalDecision: boolean;
    insertProposalClosureSummary: boolean;
    signalExtensionStart: boolean;
    immediateGoToClosure: boolean;
  };
}

/**
 * Resolves whether live UI should execute a user action through runtime or legacy fallback.
 */
export function resolveRuntimeActionExecution(
  params: ResolveRuntimeActionExecutionParams
): RuntimeActionExecution {
  if (params.runtimeFailed) {
    return {
      useRuntime: false,
      useLegacyFallback: true,
      reason: 'runtime_failed',
    };
  }

  if (params.invalidRuntimeState) {
    return {
      useRuntime: false,
      useLegacyFallback: true,
      reason: 'invalid_runtime_state',
    };
  }

  if (!hasRuntimeSession(params.runtimeSession)) {
    return {
      useRuntime: false,
      useLegacyFallback: true,
      reason: 'runtime_unavailable',
    };
  }

  return {
    useRuntime: true,
    useLegacyFallback: false,
    reason: 'runtime_available',
  };
}

/** Whether automatic legacy closure navigation should run instead of runtime closure. */
export function shouldUseLegacyClosureFallback(
  params: ResolveRuntimeActionExecutionParams
): boolean {
  const execution = resolveRuntimeActionExecution(params);
  if (execution.useLegacyFallback) {
    return true;
  }

  const closure = resolveRuntimeClosureAction({ runtimeSession: params.runtimeSession });
  return !closure.shouldNavigate;
}

/** Plans runtime vs legacy side effects for a single client action. */
export function planLiveRuntimeClientAction(
  kind: LiveRuntimeClientActionKind,
  params: ResolveRuntimeActionExecutionParams
): LiveRuntimeClientActionPlan {
  const execution = resolveRuntimeActionExecution(params);

  if (execution.useRuntime) {
    return {
      execution,
      emitClientEvent: true,
      callRuntimeTurn: true,
      legacySteps: {
        signalSessionDecision: false,
        signalProposalDecision: false,
        insertProposalClosureSummary: false,
        signalExtensionStart: false,
        immediateGoToClosure: false,
      },
    };
  }

  return {
    execution,
    emitClientEvent: false,
    callRuntimeTurn: false,
    legacySteps: {
      signalSessionDecision:
        kind === 'continue_session' || kind === 'resolve_session',
      signalProposalDecision:
        kind === 'proposal_accepted' || kind === 'proposal_rejected',
      insertProposalClosureSummary: kind === 'proposal_rejected',
      signalExtensionStart: kind === 'start_extension',
      immediateGoToClosure:
        kind === 'proposal_rejected' || kind === 'resolve_session',
    },
  };
}

/** Duplicate-click guard — returns true when the same action may proceed. */
export function canExecuteRuntimeClientAction(
  alreadyExecuted: boolean,
  processing: boolean
): boolean {
  return !alreadyExecuted && !processing;
}
