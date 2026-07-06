import type { LiveMediatorResponse } from '@/services/liveMediation';
import { isMediatorRuntimeResponseSafe } from '@/services/mediatorEngine/edge/response';
import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import type { MediatorRuntimeErrorBody } from '@/services/mediatorEngine/edge/errors';
import { adaptRuntimeToLiveResponse } from '@/services/mediatorRuntimeClient/adaptRuntimeToLiveResponse';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';

export interface MediatorRuntimeParsedSuccess {
  response: LiveMediatorResponse;
  runtime: MediatorRuntimeEdgeSuccess;
}

export type ParseMediatorRuntimeResponseResult =
  | { ok: true; value: MediatorRuntimeParsedSuccess }
  | { ok: false; error: MediatorRuntimeClientError };

function missingFieldsError(field: string): MediatorRuntimeClientError {
  return new MediatorRuntimeClientError('missing_fields', `mediator-runtime response missing ${field}`, {
    retryable: false,
  });
}

function malformedResponseError(message: string): MediatorRuntimeClientError {
  return new MediatorRuntimeClientError('malformed_response', message, { retryable: false });
}

function edgeError(body: MediatorRuntimeErrorBody, status: number): MediatorRuntimeClientError {
  return new MediatorRuntimeClientError('edge_error', body.error.message, {
    status,
    edgeCode: body.error.code,
    retryable: status >= 500,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function parseSuccessBody(body: Record<string, unknown>): ParseMediatorRuntimeResponseResult {
  if (body.ok !== true) {
    return { ok: false, error: malformedResponseError('mediator-runtime success body missing ok:true') };
  }

  if (body.engineVersion !== 'v2.3') {
    return { ok: false, error: missingFieldsError('engineVersion') };
  }

  const finalMediatorMessage = body.finalMediatorMessage;
  if (!isRecord(finalMediatorMessage)) {
    return { ok: false, error: missingFieldsError('finalMediatorMessage') };
  }

  const text = finalMediatorMessage.text;
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, error: missingFieldsError('finalMediatorMessage.text') };
  }

  if (!isRecord(body.mediationState)) {
    return { ok: false, error: missingFieldsError('mediationState') };
  }

  if (!isRecord(body.sessionMemory)) {
    return { ok: false, error: missingFieldsError('sessionMemory') };
  }

  if (!isRecord(body.intervention)) {
    return { ok: false, error: missingFieldsError('intervention') };
  }

  if (!isRecord(body.complianceResult)) {
    return { ok: false, error: missingFieldsError('complianceResult') };
  }

  if (!isRecord(body.responseValidation)) {
    return { ok: false, error: missingFieldsError('responseValidation') };
  }

  if (!isRecord(body.runtimeMetadata)) {
    return { ok: false, error: missingFieldsError('runtimeMetadata') };
  }

  const success = body as unknown as MediatorRuntimeEdgeSuccess;

  if (!isMediatorRuntimeResponseSafe(success)) {
    return {
      ok: false,
      error: malformedResponseError('mediator-runtime response contains forbidden fields'),
    };
  }

  return {
    ok: true,
    value: {
      response: adaptRuntimeToLiveResponse(success),
      runtime: success,
    },
  };
}

/**
 * Parses mediator-runtime HTTP JSON into legacy LiveMediatorResponse via adapter.
 * Never throws — returns controlled MediatorRuntimeClientError on failure.
 */
export function parseMediatorRuntimeResponse(
  body: unknown,
  status = 200
): ParseMediatorRuntimeResponseResult {
  if (!isRecord(body)) {
    return { ok: false, error: malformedResponseError('mediator-runtime response is not a JSON object') };
  }

  if (body.ok === false) {
    const errorBody = body as unknown as MediatorRuntimeErrorBody;
    if (!isRecord(errorBody.error) || typeof errorBody.error.message !== 'string') {
      return { ok: false, error: malformedResponseError('mediator-runtime error body is malformed') };
    }
    return { ok: false, error: edgeError(errorBody, status) };
  }

  return parseSuccessBody(body);
}
