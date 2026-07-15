import { AppError } from './errors.ts';
import type { ClaimOutcome, MediationSessionRow } from './types.ts';

export function asSessionRow(value: unknown): MediationSessionRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.session_id !== 'string') return null;
  if (typeof row.session_version !== 'number') return null;
  if (typeof row.current_screen !== 'string') return null;
  if (typeof row.generation_status !== 'string') return null;
  if (!row.session_payload || typeof row.session_payload !== 'object') {
    return null;
  }
  return {
    session_id: row.session_id,
    mediation_id: String(row.mediation_id ?? ''),
    couple_id: String(row.couple_id ?? ''),
    host_user_id: String(row.host_user_id ?? ''),
    partner_user_id:
      typeof row.partner_user_id === 'string' ? row.partner_user_id : null,
    conflict_category: String(row.conflict_category ?? ''),
    session_payload: row.session_payload as Record<string, unknown>,
    session_version: row.session_version,
    current_screen: row.current_screen,
    generation_status: row.generation_status,
    last_generation_kind:
      typeof row.last_generation_kind === 'string'
        ? row.last_generation_kind
        : null,
    progress_total:
      typeof row.progress_total === 'number' ? row.progress_total : 6,
    prompt_version: String(row.prompt_version ?? ''),
    model_version: String(row.model_version ?? ''),
  };
}

export function parseClaimOutcome(value: unknown): ClaimOutcome {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('INTERNAL_ERROR', 500, 'claim_shape');
  }
  const row = value as Record<string, unknown>;
  const outcome = row.outcome;

  if (outcome === 'CLAIMED') {
    if (typeof row.claimToken !== 'string' || row.claimToken.length === 0) {
      throw new AppError('INTERNAL_ERROR', 500, 'claim_token_missing');
    }
    return { outcome: 'CLAIMED', claimToken: row.claimToken };
  }
  if (outcome === 'ALREADY_CLAIMED') return { outcome: 'ALREADY_CLAIMED' };
  if (outcome === 'IN_PROGRESS') return { outcome: 'IN_PROGRESS' };
  if (outcome === 'ALREADY_COMPLETED') {
    return { outcome: 'ALREADY_COMPLETED', response: row.response };
  }
  throw new AppError('INTERNAL_ERROR', 500, 'claim_outcome');
}

export type StartGenerationResult =
  | {
      outcome: 'CLAIMED';
      claimToken: string;
      session: MediationSessionRow;
      reclaimed: boolean;
    }
  | { outcome: 'ALREADY_CLAIMED'; session: MediationSessionRow | null }
  | { outcome: 'IN_PROGRESS'; session: MediationSessionRow | null }
  | { outcome: 'ALREADY_COMPLETED'; response: unknown };

export function parseStartGenerationResult(
  data: unknown
): StartGenerationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError('INTERNAL_ERROR', 500, 'start_generation_shape');
  }
  const row = data as Record<string, unknown>;
  const outcome = row.outcome;

  if (outcome === 'CLAIMED') {
    if (typeof row.claimToken !== 'string' || row.claimToken.length === 0) {
      throw new AppError('INTERNAL_ERROR', 500, 'start_claim_token');
    }
    const session = asSessionRow(row.session);
    if (!session) {
      throw new AppError('INTERNAL_ERROR', 500, 'start_session_shape');
    }
    return {
      outcome: 'CLAIMED',
      claimToken: row.claimToken,
      session,
      reclaimed: row.reclaimed === true,
    };
  }

  if (outcome === 'ALREADY_CLAIMED') {
    return {
      outcome: 'ALREADY_CLAIMED',
      session: asSessionRow(row.session),
    };
  }

  if (outcome === 'IN_PROGRESS') {
    return {
      outcome: 'IN_PROGRESS',
      session: asSessionRow(row.session),
    };
  }

  if (outcome === 'ALREADY_COMPLETED') {
    return { outcome: 'ALREADY_COMPLETED', response: row.response };
  }

  throw new AppError('INTERNAL_ERROR', 500, 'start_outcome');
}
