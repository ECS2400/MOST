/** Controlled error kinds surfaced by mediator-runtime client. */
export type MediatorRuntimeClientErrorKind =
  | 'timeout'
  | 'network'
  | 'http'
  | 'edge_error'
  | 'malformed_response'
  | 'missing_fields';

export interface MediatorRuntimeClientErrorDetails {
  status?: number;
  edgeCode?: string;
  retryable: boolean;
  retryAfterMs?: number;
  retryCount?: number;
  validationReasonCodes?: string[];
  providerSucceeded?: boolean;
  cause?: unknown;
}

/** Typed client error — never leaks transcript or prompt content. */
export class MediatorRuntimeClientError extends Error {
  readonly kind: MediatorRuntimeClientErrorKind;
  readonly details: MediatorRuntimeClientErrorDetails;

  constructor(
    kind: MediatorRuntimeClientErrorKind,
    message: string,
    details: Partial<MediatorRuntimeClientErrorDetails> = {}
  ) {
    super(message);
    this.name = 'MediatorRuntimeClientError';
    this.kind = kind;
    this.details = {
      retryable: details.retryable ?? false,
      ...details,
    };
  }
}

export function isMediatorRuntimeClientError(
  error: unknown
): error is MediatorRuntimeClientError {
  return error instanceof MediatorRuntimeClientError;
}

export function isRetryableMediatorRuntimeClientError(
  error: MediatorRuntimeClientError
): boolean {
  return error.details.retryable;
}
