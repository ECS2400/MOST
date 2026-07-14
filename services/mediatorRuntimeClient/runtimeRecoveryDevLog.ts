export interface RuntimeRecoveryDevDiagnostics {
  mediationId: string;
  requestId: number;
  userId: string | null;
  role: string;
  rowFound: boolean;
  supabaseErrorCode: string | null;
  supabaseErrorMessage: string | null;
  rawRuntimeSessionPresent: boolean;
  runtimeMetadataPresent: boolean;
  shapeValid: boolean;
  rejectedShapeField: string | null;
  commitAllowed: boolean;
  staleRequest: boolean;
  mounted: boolean;
  recoveryClickCount: number;
}

export function logRuntimeRecoveryDev(diagnostics: RuntimeRecoveryDevDiagnostics): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[RuntimeRecovery]', diagnostics);
}

export interface RuntimeRecoveryBlockedDiagnostics {
  reason: string;
  runtimeParticipantRole: string;
  isCurrentUserHost: boolean;
  mediationId: string | null;
  loadSettled: boolean;
  runtimeUnavailable: boolean;
  attempted: boolean;
  inFlight: boolean;
}

export function logRuntimeRecoveryBlocked(diagnostics: RuntimeRecoveryBlockedDiagnostics): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[RuntimeRecoveryBlocked]', diagnostics);
}

export interface RuntimeRecoveryResultDiagnostics {
  role: string;
  loadedRuntimeSessionPresent: boolean;
  mediationStatePresent: boolean;
  sessionMemoryPresent: boolean;
  recomposeSucceeded: boolean;
  persistStarted: boolean;
  persistSucceeded: boolean;
  persistErrorCode: string | null;
  persistErrorMessage?: string | null;
  refreshedAfterPersist: boolean;
  loadedAfterPersist: boolean;
  shapeValidAfterPersist: boolean;
}

export function logRuntimeRecoveryResult(diagnostics: RuntimeRecoveryResultDiagnostics): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[RuntimeRecoveryResult]', diagnostics);
}
