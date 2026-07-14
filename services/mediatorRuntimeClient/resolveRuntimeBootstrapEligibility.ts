export type RuntimeBootstrapDiagnosis =
  | 'ready'
  | 'bootstrap_required'
  | 'invalid_participants'
  | 'runtime_unavailable';

export interface DiagnoseMediationRuntimeBootstrapParams {
  hostUserId: string;
  partnerId: string | null | undefined;
  rowFound: boolean;
  mediationStatePresent: boolean;
  sessionMemoryPresent: boolean;
  runtimeSessionPresent: boolean;
}

export function isDistinctMediationPartner(
  hostUserId: string,
  partnerId: string | null | undefined
): partnerId is string {
  return Boolean(partnerId && partnerId !== hostUserId);
}

export function isInvalidMediationParticipants(
  hostUserId: string,
  partnerId: string | null | undefined
): boolean {
  return Boolean(partnerId && partnerId === hostUserId);
}

export function isRuntimeBootstrapRequired(params: {
  mediationStatePresent: boolean;
  sessionMemoryPresent: boolean;
  runtimeSessionPresent: boolean;
}): boolean {
  return (
    !params.mediationStatePresent &&
    !params.sessionMemoryPresent &&
    !params.runtimeSessionPresent
  );
}

export function diagnoseMediationRuntimeBootstrap(
  params: DiagnoseMediationRuntimeBootstrapParams
): RuntimeBootstrapDiagnosis {
  if (!params.rowFound || !params.hostUserId) {
    return 'runtime_unavailable';
  }

  if (isInvalidMediationParticipants(params.hostUserId, params.partnerId)) {
    return 'invalid_participants';
  }

  if (
    isRuntimeBootstrapRequired({
      mediationStatePresent: params.mediationStatePresent,
      sessionMemoryPresent: params.sessionMemoryPresent,
      runtimeSessionPresent: params.runtimeSessionPresent,
    })
  ) {
    return 'bootstrap_required';
  }

  if (!params.runtimeSessionPresent) {
    return 'runtime_unavailable';
  }

  return 'ready';
}

export function canHostRunRuntimeBootstrap(
  hostUserId: string,
  partnerId: string | null | undefined
): boolean {
  return isDistinctMediationPartner(hostUserId, partnerId);
}
