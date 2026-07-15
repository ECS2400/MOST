import type { PublicErrorCode } from './types.ts';

export class AppError extends Error {
  readonly httpStatus: number;
  readonly publicCode: PublicErrorCode;
  readonly stage: string;
  mediationId?: string;
  requestId?: string;

  constructor(
    publicCode: PublicErrorCode,
    httpStatus: number,
    stage: string,
    message?: string
  ) {
    super(message ?? publicCode);
    this.name = 'AppError';
    this.publicCode = publicCode;
    this.httpStatus = httpStatus;
    this.stage = stage;
  }
}

const RPC_CODE_MAP: Array<{
  match: string;
  publicCode: PublicErrorCode;
  httpStatus: number;
}> = [
  { match: 'MEDIATION_NOT_FOUND', publicCode: 'MEDIATION_NOT_FOUND', httpStatus: 404 },
  { match: 'MEDIATION_COUPLE_MISMATCH', publicCode: 'FORBIDDEN', httpStatus: 403 },
  { match: 'COUPLE_NOT_FOUND', publicCode: 'FORBIDDEN', httpStatus: 403 },
  { match: 'HOST_PROFILE_NOT_FOUND', publicCode: 'FORBIDDEN', httpStatus: 403 },
  { match: 'PARTNER_PROFILE_NOT_FOUND', publicCode: 'PARTNER_NOT_READY', httpStatus: 409 },
  { match: 'COUPLE_MEMBERSHIP_MISMATCH', publicCode: 'FORBIDDEN', httpStatus: 403 },
  { match: 'SESSION_IDENTITY_CONFLICT', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'SESSION_NOT_FOUND', publicCode: 'INTERNAL_ERROR', httpStatus: 500 },
  { match: 'SESSION_VERSION_CONFLICT', publicCode: 'SESSION_VERSION_CONFLICT', httpStatus: 409 },
  { match: 'INVALID_TRANSITION', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'DUPLICATE_ACTION', publicCode: 'DUPLICATE_ACTION', httpStatus: 409 },
  { match: 'REQUEST_ID_ALREADY_USED', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'INVALID_CONFLICT_CATEGORY', publicCode: 'CONFLICT_CATEGORY_MISSING', httpStatus: 422 },
  { match: 'HOST_PARTNER_MUST_DIFFER', publicCode: 'PARTNER_NOT_READY', httpStatus: 409 },
  { match: 'INVALID_GENERATION_STATUS', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'INVALID_GENERATION_KIND', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'SUMMARY_ALREADY_PRESENT', publicCode: 'UNSUPPORTED_SESSION_STATE', httpStatus: 422 },
  { match: 'EASY_CHOICES_ALREADY_PRESENT', publicCode: 'UNSUPPORTED_SESSION_STATE', httpStatus: 422 },
  { match: 'REQUEST_ID_ALREADY_USED', publicCode: 'INVALID_TRANSITION', httpStatus: 409 },
  { match: 'LLM_CALL_BUDGET_EXCEEDED', publicCode: 'LLM_CALL_BUDGET_EXCEEDED', httpStatus: 409 },
];

export function mapRpcErrorMessage(message: string, stage: string): AppError {
  const upper = message.toUpperCase();
  for (const entry of RPC_CODE_MAP) {
    if (upper.includes(entry.match)) {
      return new AppError(entry.publicCode, entry.httpStatus, stage, entry.match);
    }
  }
  return new AppError('INTERNAL_ERROR', 500, stage);
}

export function logStageError(input: {
  publicCode: string;
  stage: string;
  requestId?: string;
  mediationId?: string;
}): void {
  console.error('[mediation-turn-v2]', {
    publicCode: input.publicCode,
    stage: input.stage,
    requestId: input.requestId ?? null,
    mediationId: input.mediationId ?? null,
  });
}
