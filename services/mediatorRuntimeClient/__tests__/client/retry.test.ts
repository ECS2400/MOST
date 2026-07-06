import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';
import {
  createHttpMediatorRuntimeError,
  isRetryableHttpStatus,
  withMediatorRuntimeRetry,
} from '@/services/mediatorRuntimeClient/retry';

describe('mediatorRuntime retry', () => {
  it('retries network errors up to maxRetries', async () => {
    let calls = 0;
    const result = await withMediatorRuntimeRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new MediatorRuntimeClientError('network', 'offline', { retryable: true });
        }
        return 'ok';
      },
      { maxRetries: 2, delaysMs: [0], sleep: async () => {} }
    );

    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('does not retry 400 errors', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withMediatorRuntimeRetry(
          async () => {
            calls += 1;
            throw createHttpMediatorRuntimeError(400);
          },
          { maxRetries: 2, delaysMs: [0], sleep: async () => {} }
        ),
      (error: MediatorRuntimeClientError) => {
        assert.equal(error.kind, 'http');
        assert.equal(error.details.retryable, false);
        return true;
      }
    );
    assert.equal(calls, 1);
  });

  it('does not retry 401 or 403 errors', () => {
    assert.equal(isRetryableHttpStatus(401), false);
    assert.equal(isRetryableHttpStatus(403), false);
    assert.equal(createHttpMediatorRuntimeError(401).details.retryable, false);
    assert.equal(createHttpMediatorRuntimeError(403).details.retryable, false);
  });

  it('does not echo response body in HTTP error message', () => {
    const error = createHttpMediatorRuntimeError(500);
    assert.equal(error.message, 'mediator-runtime HTTP 500');
    assert.ok(!error.message.includes('secret transcript content'));
  });

  it('retries 5xx errors', async () => {
    let calls = 0;
    const result = await withMediatorRuntimeRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw createHttpMediatorRuntimeError(503);
        }
        return 42;
      },
      { maxRetries: 1, delaysMs: [0], sleep: async () => {} }
    );

    assert.equal(result, 42);
    assert.equal(calls, 2);
  });

  it('retries timeout errors', async () => {
    let calls = 0;
    const result = await withMediatorRuntimeRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw new MediatorRuntimeClientError('timeout', 'timed out', { retryable: true });
        }
        return true;
      },
      { maxRetries: 1, delaysMs: [0], sleep: async () => {} }
    );

    assert.equal(result, true);
    assert.equal(calls, 2);
  });
});
