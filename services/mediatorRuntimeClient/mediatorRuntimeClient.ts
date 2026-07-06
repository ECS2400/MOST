import type { LiveMediatorResponse } from '@/services/liveMediation';
import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { MEDIATOR_RUNTIME_DEFAULT_TIMEOUT_MS } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';
import {
  createHttpMediatorRuntimeError,
  withMediatorRuntimeRetry,
  wrapFetchFailure,
  type MediatorRuntimeRetryOptions,
} from '@/services/mediatorRuntimeClient/retry';
import {
  parseMediatorRuntimeResponse,
  type MediatorRuntimeParsedSuccess,
} from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';

export interface MediatorRuntimeClientOptions {
  timeoutMs?: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  retry?: MediatorRuntimeRetryOptions;
  headers?: Record<string, string>;
}

export interface MediatorRuntimeClientResult extends MediatorRuntimeParsedSuccess {}

async function resolveEndpoint(endpoint?: string): Promise<string> {
  if (endpoint) return endpoint;
  const { getMediatorRuntimeEndpoint } = await import(
    '@/services/mediatorRuntimeClient/supabaseBridge'
  );
  return getMediatorRuntimeEndpoint();
}

async function resolveHeaders(
  headers?: Record<string, string>
): Promise<Record<string, string>> {
  if (headers) return headers;
  const { getMediatorRuntimeRequestHeaders } = await import(
    '@/services/mediatorRuntimeClient/supabaseBridge'
  );
  return getMediatorRuntimeRequestHeaders();
}

async function fetchMediatorRuntimeRaw(
  input: MediatorRuntimeClientInput,
  options: MediatorRuntimeClientOptions
): Promise<{ status: number; body: unknown }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = await resolveEndpoint(options.endpoint);
  const timeoutMs = options.timeoutMs ?? MEDIATOR_RUNTIME_DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = await resolveHeaders(options.headers);
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMediatorRuntimeRequest(input)),
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        if (!response.ok) {
          throw createHttpMediatorRuntimeError(response.status);
        }
        throw new MediatorRuntimeClientError('malformed_response', 'mediator-runtime response is not valid JSON', {
          status: response.status,
          retryable: false,
        });
      }
    }

    if (!response.ok) {
      if (isRecord(body) && body.ok === false) {
        const parsed = parseMediatorRuntimeResponse(body, response.status);
        if (!parsed.ok) throw parsed.error;
      }
      throw createHttpMediatorRuntimeError(response.status);
    }

    return { status: response.status, body };
  } catch (error) {
    throw wrapFetchFailure(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

/**
 * Calls mediator-runtime Edge Function and returns legacy LiveMediatorResponse.
 * Parallel path — not wired into liveMediation.ts yet.
 */
export async function callMediatorRuntime(
  input: MediatorRuntimeClientInput,
  options: MediatorRuntimeClientOptions = {}
): Promise<MediatorRuntimeClientResult> {
  const { status, body } = await withMediatorRuntimeRetry(
    () => fetchMediatorRuntimeRaw(input, options),
    options.retry
  );

  const parsed = parseMediatorRuntimeResponse(body, status);
  if (!parsed.ok) {
    throw parsed.error;
  }

  return parsed.value;
}

/** Convenience wrapper returning only LiveMediatorResponse for legacy consumers. */
export async function callMediatorRuntimeForLiveFlow(
  input: MediatorRuntimeClientInput,
  options: MediatorRuntimeClientOptions = {}
): Promise<LiveMediatorResponse> {
  const result = await callMediatorRuntime(input, options);
  return result.response;
}

export type {
  MediatorRuntimeClientInput,
  MediatorRuntimeParsedSuccess,
  MediatorRuntimeClientOptions,
};
