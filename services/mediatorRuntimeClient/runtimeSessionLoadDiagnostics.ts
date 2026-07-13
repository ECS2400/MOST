import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeSessionParticipantRole = 'host' | 'partner' | 'unknown';

export interface RuntimeSessionLoadDiagnostics {
  role: RuntimeSessionParticipantRole;
  mediationId: string;
  loadAttempted: boolean;
  rowFound: boolean;
  runtimeSessionPresent: boolean;
  shapeValid: boolean;
  supabaseErrorCode: string | null;
}

export function buildRuntimeSessionLoadDiagnostics(params: {
  role: RuntimeSessionParticipantRole;
  mediationId: string;
  loadAttempted: boolean;
  rowFound: boolean;
  rawRuntimeSession: unknown;
  supabaseErrorCode?: string | null;
}): RuntimeSessionLoadDiagnostics {
  const shapeValid = isRuntimeSessionShape(params.rawRuntimeSession);
  return {
    role: params.role,
    mediationId: params.mediationId,
    loadAttempted: params.loadAttempted,
    rowFound: params.rowFound,
    runtimeSessionPresent: params.rawRuntimeSession != null,
    shapeValid,
    supabaseErrorCode: params.supabaseErrorCode ?? null,
  };
}

export function logRuntimeSessionLoadDiagnostics(
  diagnostics: RuntimeSessionLoadDiagnostics
): void {
  if (!__DEV__) return;
  console.log('[RuntimeSession load]', diagnostics);
}

export function resolveRuntimeSessionFromRow(
  rawRuntimeSession: unknown
): RuntimeSession | null {
  return isRuntimeSessionShape(rawRuntimeSession) ? rawRuntimeSession : null;
}
