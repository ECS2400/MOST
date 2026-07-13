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
  if (!__DEV__) return;
  console.log('[RuntimeRecovery]', diagnostics);
}
