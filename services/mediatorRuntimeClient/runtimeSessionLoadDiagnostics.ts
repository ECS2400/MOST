import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import {
  identifyRejectedRuntimeSessionShapeField,
  normalizeStoredRuntimeSession,
} from '@/services/mediatorRuntimeClient/normalizeStoredRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeSessionParticipantRole = 'host' | 'partner' | 'unknown';

export interface RuntimeSessionLoadDiagnostics {
  role: RuntimeSessionParticipantRole;
  mediationId: string;
  loadAttempted: boolean;
  rowFound: boolean;
  runtimeSessionPresent: boolean;
  runtimeMetadataPresent: boolean;
  shapeValid: boolean;
  rejectedShapeField: string | null;
  supabaseErrorCode: string | null;
  supabaseErrorMessage: string | null;
}

export function buildRuntimeSessionLoadDiagnostics(params: {
  role: RuntimeSessionParticipantRole;
  mediationId: string;
  loadAttempted: boolean;
  rowFound: boolean;
  rawRuntimeSession: unknown;
  rawRuntimeMetadata?: unknown;
  supabaseErrorCode?: string | null;
  supabaseErrorMessage?: string | null;
}): RuntimeSessionLoadDiagnostics {
  const normalized = normalizeStoredRuntimeSession(params.rawRuntimeSession);
  const shapeValid = normalized != null || isRuntimeSessionShape(params.rawRuntimeSession);
  return {
    role: params.role,
    mediationId: params.mediationId,
    loadAttempted: params.loadAttempted,
    rowFound: params.rowFound,
    runtimeSessionPresent: params.rawRuntimeSession != null,
    runtimeMetadataPresent: params.rawRuntimeMetadata != null,
    shapeValid,
    rejectedShapeField: shapeValid
      ? null
      : identifyRejectedRuntimeSessionShapeField(params.rawRuntimeSession),
    supabaseErrorCode: params.supabaseErrorCode ?? null,
    supabaseErrorMessage: params.supabaseErrorMessage ?? null,
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
  return normalizeStoredRuntimeSession(rawRuntimeSession);
}
