import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeActionExecutionReason =
  | 'runtime_available'
  | 'runtime_unavailable'
  | 'runtime_failed'
  | 'invalid_runtime_state';

export interface RuntimeActionExecution {
  useRuntime: boolean;
  runtimeUnavailable: boolean;
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
}

/**
 * Resolves whether live UI should execute a user action through runtime.
 */
export function resolveRuntimeActionExecution(
  params: ResolveRuntimeActionExecutionParams
): RuntimeActionExecution {
  if (params.runtimeFailed) {
    return {
      useRuntime: false,
      runtimeUnavailable: true,
      reason: 'runtime_failed',
    };
  }

  if (params.invalidRuntimeState) {
    return {
      useRuntime: false,
      runtimeUnavailable: true,
      reason: 'invalid_runtime_state',
    };
  }

  if (!hasRuntimeSession(params.runtimeSession)) {
    return {
      useRuntime: false,
      runtimeUnavailable: true,
      reason: 'runtime_unavailable',
    };
  }

  return {
    useRuntime: true,
    runtimeUnavailable: false,
    reason: 'runtime_available',
  };
}

/** Plans runtime side effects for a single client action. */
export function planLiveRuntimeClientAction(
  _kind: LiveRuntimeClientActionKind,
  params: ResolveRuntimeActionExecutionParams
): LiveRuntimeClientActionPlan {
  const execution = resolveRuntimeActionExecution(params);

  if (execution.useRuntime) {
    return {
      execution,
      emitClientEvent: true,
      callRuntimeTurn: true,
    };
  }

  return {
    execution,
    emitClientEvent: false,
    callRuntimeTurn: false,
  };
}

/** Duplicate-click guard — returns true when the same action may proceed. */
export function canExecuteRuntimeClientAction(
  alreadyExecuted: boolean,
  processing: boolean
): boolean {
  return !alreadyExecuted && !processing;
}
