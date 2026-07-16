import type { MediationRow, MediationSessionRow } from './types.ts';

/** Stable session identity — independent of which participant calls. */
export type SessionIdentityArgs = {
  mediationId: string;
  coupleId: string;
  hostUserId: string;
  partnerUserId: string;
  conflictCategory: string;
};

/**
 * Build create_mediation_session identity from mediation row.
 * host = mediations.user_id, partner = mediations.partner_id.
 * Never derived from the current auth subject.
 */
export function buildSessionIdentityFromMediation(
  mediation: MediationRow
): SessionIdentityArgs | { error: 'COUPLE_MISSING' | 'PARTNER_NOT_READY' | 'CONFLICT_CATEGORY_MISSING' } {
  if (!mediation.couple_id) {
    return { error: 'COUPLE_MISSING' };
  }
  if (!mediation.partner_id || mediation.partner_id === mediation.user_id) {
    return { error: 'PARTNER_NOT_READY' };
  }
  const category =
    typeof mediation.conflict_category === 'string'
      ? mediation.conflict_category.trim()
      : '';
  if (!category) {
    return { error: 'CONFLICT_CATEGORY_MISSING' };
  }
  return {
    mediationId: mediation.id,
    coupleId: mediation.couple_id,
    hostUserId: mediation.user_id,
    partnerUserId: mediation.partner_id,
    conflictCategory: category,
  };
}

export function sessionIdentityFromRow(
  session: Pick<
    MediationSessionRow,
    | 'mediation_id'
    | 'couple_id'
    | 'host_user_id'
    | 'partner_user_id'
    | 'conflict_category'
  >
): SessionIdentityArgs | null {
  if (!session.partner_user_id) return null;
  return {
    mediationId: session.mediation_id,
    coupleId: session.couple_id,
    hostUserId: session.host_user_id,
    partnerUserId: session.partner_user_id,
    conflictCategory: session.conflict_category,
  };
}

export type IdentityField =
  | 'mediationId'
  | 'coupleId'
  | 'hostUserId'
  | 'partnerUserId'
  | 'conflictCategory';

/** Returns differing identity fields (names only — no values). */
export function differingIdentityFields(
  a: SessionIdentityArgs,
  b: SessionIdentityArgs
): IdentityField[] {
  const fields: IdentityField[] = [
    'mediationId',
    'coupleId',
    'hostUserId',
    'partnerUserId',
    'conflictCategory',
  ];
  return fields.filter((f) => a[f] !== b[f]);
}

export function identitiesMatch(
  a: SessionIdentityArgs,
  b: SessionIdentityArgs
): boolean {
  return differingIdentityFields(a, b).length === 0;
}

/**
 * Pure model of create_mediation_session ON CONFLICT identity guard.
 * Does not touch DB — tests the contract Edge relies on.
 */
export function evaluateCreateIdentityConflict(input: {
  existing: SessionIdentityArgs | null;
  proposed: SessionIdentityArgs;
}): 'CREATE_NEW' | 'RETURN_EXISTING' | 'SESSION_IDENTITY_CONFLICT' {
  if (!input.existing) return 'CREATE_NEW';
  if (!identitiesMatch(input.existing, input.proposed)) {
    return 'SESSION_IDENTITY_CONFLICT';
  }
  return 'RETURN_EXISTING';
}

export type FindSessionLookupResult =
  | { kind: 'missing' }
  | { kind: 'found'; sessionId: string }
  | { kind: 'query_failed' }
  | { kind: 'bad_shape' };

/**
 * Classify PostgREST maybeSingle result for mediation_sessions lookup.
 * query_failed / bad_shape must never be treated as missing (no create).
 */
export function classifyFindSessionLookup(input: {
  error: unknown | null | undefined;
  data: unknown;
}): FindSessionLookupResult {
  if (input.error) return { kind: 'query_failed' };
  if (input.data == null) return { kind: 'missing' };
  if (typeof input.data !== 'object' || Array.isArray(input.data)) {
    return { kind: 'bad_shape' };
  }
  const sessionId = (input.data as { session_id?: unknown }).session_id;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { kind: 'bad_shape' };
  }
  return { kind: 'found', sessionId };
}

/** Whether Edge may call create_mediation_session after this lookup. */
export function mayCreateAfterLookup(
  result: FindSessionLookupResult
): boolean {
  return result.kind === 'missing';
}
