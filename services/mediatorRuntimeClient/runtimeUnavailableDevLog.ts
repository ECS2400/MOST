import type { RuntimeSessionLoadDiagnostics } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import type { RuntimeActionExecutionReason } from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';

export interface RuntimeUnavailableDevDiagnostics {
  runtimeUnavailableReason: RuntimeActionExecutionReason | 'runtime_loading';
  edgeResponseOk: boolean | null;
  runtimeSessionPresentInResponse: boolean | null;
  runtimeSessionPersisted: boolean | null;
  runtimeSessionLoaded: boolean;
  runtimeSessionShapeValid: boolean;
  runtimeFailed: boolean;
  invalidRuntimeState: boolean;
}

export interface BuildRuntimeUnavailableDevDiagnosticsParams {
  runtimeUnavailableReason: RuntimeActionExecutionReason | 'runtime_loading';
  runtimeSessionLoaded: boolean;
  runtimeSessionShapeValid: boolean;
  runtimeFailed: boolean;
  invalidRuntimeState: boolean;
  loadDiagnostics?: RuntimeSessionLoadDiagnostics | null;
  edgeResponseOk?: boolean | null;
  runtimeSessionPresentInResponse?: boolean | null;
}

export function buildRuntimeUnavailableDevDiagnostics(
  params: BuildRuntimeUnavailableDevDiagnosticsParams
): RuntimeUnavailableDevDiagnostics {
  const load = params.loadDiagnostics ?? null;
  return {
    runtimeUnavailableReason: params.runtimeUnavailableReason,
    edgeResponseOk: params.edgeResponseOk ?? null,
    runtimeSessionPresentInResponse:
      params.runtimeSessionPresentInResponse ??
      (load?.runtimeSessionPresent ?? null),
    runtimeSessionPersisted: load?.runtimeSessionPresent ?? null,
    runtimeSessionLoaded: params.runtimeSessionLoaded,
    runtimeSessionShapeValid: params.runtimeSessionShapeValid,
    runtimeFailed: params.runtimeFailed,
    invalidRuntimeState: params.invalidRuntimeState,
  };
}

export function logRuntimeUnavailableDevDiagnostics(
  diagnostics: RuntimeUnavailableDevDiagnostics
): void {
  if (!__DEV__) return;
  console.log('[RuntimeUnavailable DEV]', diagnostics);
}
