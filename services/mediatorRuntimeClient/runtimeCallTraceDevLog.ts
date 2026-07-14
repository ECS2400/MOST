import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { isMediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';

function safeHeaderKeys(headers: Record<string, string>): string[] {
  return Object.keys(headers).map((key) => key.toLowerCase());
}

function summarizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (record.ok === false && record.error && typeof record.error === 'object') {
    const err = record.error as Record<string, unknown>;
    return {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      },
    };
  }
  if (typeof record.message === 'string') {
    return { message: record.message, hint: record.hint };
  }
  return {
    ok: record.ok,
    engineVersion: record.engineVersion,
    keys: Object.keys(record).slice(0, 12),
  };
}

export function logRuntimeRequestStart(params: {
  mediationId: string;
  mode?: string;
  traceId?: string;
  endpoint: string;
  turnNumber: number;
  trigger: string;
  headerKeys: string[];
}): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  console.info('[RUNTIME_REQUEST_START]', params);
}

export function logRuntimeResponse(params: {
  mediationId: string;
  mode?: string;
  traceId?: string;
  status: number;
  headerKeys: string[];
  body: unknown;
}): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  console.info('[RUNTIME_RESPONSE]', {
    ...params,
    body: summarizeBody(params.body),
  });
}

export function logRuntimeException(params: {
  mediationId: string;
  mode?: string;
  traceId?: string;
  error: unknown;
}): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  const err = params.error;
  const base =
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          stack: err.stack,
          cause: (err as Error & { cause?: unknown }).cause,
        }
      : { value: String(err) };

  const client = isMediatorRuntimeClientError(err)
    ? {
        kind: err.kind,
        status: err.details.status,
        edgeCode: err.details.edgeCode,
        retryable: err.details.retryable,
      }
    : null;

  console.error('[RUNTIME_EXCEPTION]', {
    mediationId: params.mediationId,
    mode: params.mode,
    traceId: params.traceId,
    ...base,
    client,
  });
}

export function logRuntimeExceptionSwallowed(params: {
  mediationId: string;
  mode?: string;
  traceId?: string;
  error: unknown;
  swallowSite: string;
}): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  logRuntimeException({
    mediationId: params.mediationId,
    mode: params.mode,
    traceId: params.traceId,
    error: params.error,
  });
  console.error('[RUNTIME_EXCEPTION_SWALLOWED]', {
    mediationId: params.mediationId,
    mode: params.mode,
    traceId: params.traceId,
    swallowSite: params.swallowSite,
  });
}

export function buildRuntimeCallTraceId(mediationId: string, mode?: string): string {
  return `${mediationId}:${mode ?? 'unknown'}:${Date.now()}`;
}

export function logRuntimeRequestStartFromInput(
  input: MediatorRuntimeClientInput,
  endpoint: string,
  headers: Record<string, string>,
  mode?: string
): string {
  const traceId = buildRuntimeCallTraceId(input.mediationId, mode);
  logRuntimeRequestStart({
    mediationId: input.mediationId,
    mode,
    traceId,
    endpoint,
    turnNumber: input.turnNumber,
    trigger: input.trigger,
    headerKeys: safeHeaderKeys(headers),
  });
  return traceId;
}
