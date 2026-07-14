import { MEDIATOR_RUNTIME_BUILD_ID } from '@/services/mediatorEngine/edge/mediatorRuntimeBuild';

function shouldEmitRuntimeRequestDiagnostics(): boolean {
  if (typeof Deno !== 'undefined') return true;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Logs inbound HTTP correlation fields available inside the Edge isolate. */
export function logRuntimeRequestContext(params: {
  method: string;
  cfRay?: string | null;
  sbRequestId?: string | null;
  mediationId?: string | null;
  trigger?: string | null;
  turnNumber?: number | null;
  engineVersion?: string | null;
}): void {
  if (!shouldEmitRuntimeRequestDiagnostics()) return;

  console.info('[RUNTIME_REQUEST_CONTEXT]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    method: params.method,
    cfRay: params.cfRay ?? null,
    sbRequestId: params.sbRequestId ?? null,
    mediationId: params.mediationId ?? null,
    trigger: params.trigger ?? null,
    turnNumber: params.turnNumber ?? null,
    engineVersion: params.engineVersion ?? null,
    // Helps verify which diagnostic log families shipped in this bundle.
    diagnosticsCapabilities: {
      llmValidationTrace: true,
      runtimeTurnTrace: true,
      requestContextTrace: true,
    },
  });
}
