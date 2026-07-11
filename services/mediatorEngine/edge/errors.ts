/** Edge API error codes for mediator-runtime. */
export const MEDIATOR_RUNTIME_ERROR_CODES = {
  MALFORMED_JSON: 'malformed_json',
  MISSING_MEDIATION_ID: 'missing_mediation_id',
  MISSING_SESSION_ID: 'missing_session_id',
  UNSUPPORTED_ENGINE_VERSION: 'unsupported_engine_version',
  MISSING_OPENAI_API_KEY: 'missing_openai_api_key',
  INVALID_CLIENT_EVENTS: 'invalid_client_events',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type MediatorRuntimeErrorCode =
  (typeof MEDIATOR_RUNTIME_ERROR_CODES)[keyof typeof MEDIATOR_RUNTIME_ERROR_CODES];

export interface MediatorRuntimeErrorBody {
  ok: false;
  error: {
    code: MediatorRuntimeErrorCode;
    message: string;
  };
}

export function createMediatorRuntimeError(
  code: MediatorRuntimeErrorCode,
  message: string
): MediatorRuntimeErrorBody {
  return {
    ok: false,
    error: { code, message },
  };
}

/** HTTP status for a given edge error code. */
export function mediatorRuntimeErrorStatus(code: MediatorRuntimeErrorCode): number {
  switch (code) {
    case MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON:
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_MEDIATION_ID:
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_SESSION_ID:
    case MEDIATOR_RUNTIME_ERROR_CODES.UNSUPPORTED_ENGINE_VERSION:
    case MEDIATOR_RUNTIME_ERROR_CODES.INVALID_CLIENT_EVENTS:
      return 400;
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_OPENAI_API_KEY:
      return 503;
    default:
      return 500;
  }
}
