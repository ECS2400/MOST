import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callMediatorRuntime } from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';
import { createClientInputFixture, createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>
): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) =>
    handler(String(url), init)) as typeof fetch;
}

const TEST_HEADERS = { apikey: 'test', Authorization: 'Bearer test' };

describe('mediatorRuntimeClient', () => {
  it('returns parsed LiveMediatorResponse on HTTP 200', async () => {
    const success = createMinimalRuntimeSuccess();
    const fetchImpl = mockFetch(async () =>
      new Response(JSON.stringify(success), { status: 200 })
    );

    const result = await callMediatorRuntime(createClientInputFixture(), {
      endpoint: 'https://example.test/functions/v1/mediator-runtime',
      headers: TEST_HEADERS,
      fetchImpl,
      retry: { maxRetries: 0, delaysMs: [0], sleep: async () => {} },
    });

    assert.equal(result.response.aiQuestion, success.finalMediatorMessage.text);
    assert.equal(result.runtime.ok, true);
  });

  it('maps network failure to MediatorRuntimeClientError', async () => {
    const fetchImpl = mockFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await assert.rejects(
      () =>
        callMediatorRuntime(createClientInputFixture(), {
          endpoint: 'https://example.test/functions/v1/mediator-runtime',
          headers: TEST_HEADERS,
          fetchImpl,
          retry: { maxRetries: 0, delaysMs: [0], sleep: async () => {} },
        }),
      (error: MediatorRuntimeClientError) => {
        assert.equal(error.kind, 'network');
        assert.equal(error.details.retryable, true);
        return true;
      }
    );
  });

  it('maps timeout (AbortError) to MediatorRuntimeClientError', async () => {
    const fetchImpl = mockFetch(async (_url, init) => {
      const signal = init?.signal;
      await new Promise<void>((resolve) => {
        signal?.addEventListener('abort', () => resolve());
      });
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    });

    await assert.rejects(
      () =>
        callMediatorRuntime(createClientInputFixture(), {
          endpoint: 'https://example.test/functions/v1/mediator-runtime',
          headers: TEST_HEADERS,
          fetchImpl,
          timeoutMs: 5,
          retry: { maxRetries: 0, delaysMs: [0], sleep: async () => {} },
        }),
      (error: MediatorRuntimeClientError) => {
        assert.equal(error.kind, 'timeout');
        return true;
      }
    );
  });

  it('maps malformed JSON to MediatorRuntimeClientError', async () => {
    const fetchImpl = mockFetch(async () => new Response('not-json', { status: 200 }));

    await assert.rejects(
      () =>
        callMediatorRuntime(createClientInputFixture(), {
          endpoint: 'https://example.test/functions/v1/mediator-runtime',
          headers: TEST_HEADERS,
          fetchImpl,
          retry: { maxRetries: 0, delaysMs: [0], sleep: async () => {} },
        }),
      (error: MediatorRuntimeClientError) => {
        assert.equal(error.kind, 'malformed_response');
        return true;
      }
    );
  });

  it('maps HTTP 500 to retryable http error', async () => {
    let calls = 0;
    const fetchImpl = mockFetch(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response('server error', { status: 500 });
      }
      const success = createMinimalRuntimeSuccess();
      return new Response(JSON.stringify(success), { status: 200 });
    });

    const result = await callMediatorRuntime(createClientInputFixture(), {
      endpoint: 'https://example.test/functions/v1/mediator-runtime',
      headers: TEST_HEADERS,
      fetchImpl,
      retry: { maxRetries: 1, delaysMs: [0], sleep: async () => {} },
    });

    assert.equal(calls, 2);
    assert.ok(result.response.aiQuestion);
  });
});
