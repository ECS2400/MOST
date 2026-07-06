import {
  MediatorRuntimeClientError,
  isRetryableMediatorRuntimeClientError,
} from '@/services/mediatorRuntimeClient/errors';
import {
  MEDIATOR_RUNTIME_MAX_RETRIES,
  MEDIATOR_RUNTIME_RETRY_DELAYS_MS,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';

export interface MediatorRuntimeRetryOptions {
  maxRetries?: number;
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** HTTP status codes that must never be retried. */
const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403]);

/** Returns true when an HTTP status may be retried (5xx only). */
export function isRetryableHttpStatus(status: number): boolean {
  if (NON_RETRYABLE_HTTP_STATUSES.has(status)) return false;
  return status >= 500;
}

/** Maps HTTP status to a controlled client error with retry hint. Body text is never echoed. */
export function createHttpMediatorRuntimeError(status: number): MediatorRuntimeClientError {
  const retryable = isRetryableHttpStatus(status);
  return new MediatorRuntimeClientError('http', `mediator-runtime HTTP ${status}`, {
    status,
    retryable,
  });
}

function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'AbortError'
  );
}

/** Wraps a low-level fetch failure as a controlled network or timeout error. */
export function wrapFetchFailure(error: unknown): MediatorRuntimeClientError {
  if (error instanceof MediatorRuntimeClientError) return error;
  if (isAbortError(error)) {
    return new MediatorRuntimeClientError('timeout', 'mediator-runtime request timed out', {
      retryable: true,
      cause: error,
    });
  }
  return new MediatorRuntimeClientError('network', 'mediator-runtime network request failed', {
    retryable: true,
    cause: error,
  });
}

/** Executes fn with bounded retries for network, timeout, and 5xx errors only. */
export async function withMediatorRuntimeRetry<T>(
  fn: () => Promise<T>,
  options: MediatorRuntimeRetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MEDIATOR_RUNTIME_MAX_RETRIES;
  const delaysMs = options.delaysMs ?? MEDIATOR_RUNTIME_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  let lastError: MediatorRuntimeClientError | undefined;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const clientError =
        error instanceof MediatorRuntimeClientError
          ? error
          : wrapFetchFailure(error);

      if (!isRetryableMediatorRuntimeClientError(clientError) || attempt >= maxRetries) {
        throw clientError;
      }

      lastError = clientError;
      const delay = delaysMs[Math.min(attempt, delaysMs.length - 1)] ?? delaysMs[delaysMs.length - 1];
      await sleep(delay);
      attempt += 1;
    }
  }

  throw lastError ?? new MediatorRuntimeClientError('network', 'mediator-runtime retry exhausted');
}
