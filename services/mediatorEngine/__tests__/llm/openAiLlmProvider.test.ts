/**
 * OpenAI LLM Provider — production adapter tests (Phase 2F).
 *
 *   npm run test:mediator:llm
 *
 * Uses fake fetchImpl only — no live API calls.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LlmProviderRequest } from '@/types/mediator';
import {
  buildRequestBody,
  createOpenAiLlmProvider,
  parseOpenAiResponse,
} from '@/services/mediatorEngine/llm/adapters/openAiLlmProvider';
import {
  LlmProviderEmptyResponseError,
  LlmProviderHttpError,
  LlmProviderMalformedResponseError,
  LlmProviderTimeoutError,
  MissingLlmApiKeyError,
} from '@/services/mediatorEngine/llm/adapters/providerErrors';

function createSampleRequest(overrides: Partial<LlmProviderRequest> = {}): LlmProviderRequest {
  return {
    systemPrompt: 'You are an AI mediator for couples in conflict.',
    developerPrompt: 'Follow mediator constitution: no blame, no diagnosis.',
    userPrompt: 'Partner: I feel unheard when plans change without notice.',
    modelHints: {
      temperature: 0.35,
      maxOutputTokens: 220,
      style: 'calm',
      responseFormat: 'plain_text',
    },
    metadata: {
      turnNumber: 3,
      language: 'en',
      safetyLevel: 'none',
      interventionType: 'validate',
      goal: 'SAFE_OPENING',
    },
    ...overrides,
  };
}

function createSuccessResponse(text: string, usage?: Record<string, number>) {
  return {
    choices: [{ message: { content: text }, finish_reason: 'stop' }],
    usage: usage ?? { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
  };
}

function createFakeFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>
): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) =>
    handler(String(url), init ?? {})) as typeof fetch;
}

describe('createOpenAiLlmProvider — production adapter', () => {
  it('brak apiKey → MissingLlmApiKeyError', async () => {
    const provider = createOpenAiLlmProvider({
      fetchImpl: createFakeFetch(() => new Response('{}', { status: 200 })),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof MissingLlmApiKeyError
    );
  });

  it('pusty apiKey → MissingLlmApiKeyError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: '   ',
      fetchImpl: createFakeFetch(() => new Response('{}', { status: 200 })),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof MissingLlmApiKeyError
    );
  });

  it('fake fetch success → ProviderResponse.text', async () => {
    const expectedText = 'I hear that this is difficult for both of you.';
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createFakeFetch((_url, init) => {
        assert.equal(init.method, 'POST');
        return new Response(JSON.stringify(createSuccessResponse(expectedText)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });

    const result = await provider.generateText(createSampleRequest());

    assert.equal(result.text, expectedText);
    assert.equal(result.provider, 'openai');
    assert.equal(result.model, 'gpt-4o-mini');
    assert.equal(result.finishReason, 'stop');
    assert.ok(result.latencyMs >= 0);
  });

  it('request zawiera system/developer/user prompts', async () => {
    const request = createSampleRequest();
    let capturedBody: Record<string, unknown> | null = null;

    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch((_url, init) => {
        capturedBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify(createSuccessResponse('Calm reply.')), { status: 200 });
      }),
    });

    await provider.generateText(request);

    assert.ok(capturedBody);
    const messages = (capturedBody as { messages: Array<{ role: string; content: string }> })
      .messages;
    assert.equal(messages[0]?.role, 'system');
    assert.equal(messages[0]?.content, request.systemPrompt);
    assert.equal(messages[1]?.role, 'developer');
    assert.equal(messages[1]?.content, request.developerPrompt);
    assert.equal(messages[2]?.role, 'user');
    assert.equal(messages[2]?.content, request.userPrompt);
  });

  it('request używa modelHints temperature/maxOutputTokens', async () => {
    const request = createSampleRequest({
      modelHints: {
        temperature: 0.15,
        maxOutputTokens: 180,
        style: 'concise',
        responseFormat: 'plain_text',
      },
    });
    let capturedBody: Record<string, unknown> | null = null;

    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch((_url, init) => {
        capturedBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify(createSuccessResponse('Brief reply.')), { status: 200 });
      }),
    });

    await provider.generateText(request);

    assert.equal(capturedBody?.temperature, 0.15);
    assert.equal(capturedBody?.max_tokens, 180);
  });

  it('malformed response → LlmProviderMalformedResponseError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() => new Response(JSON.stringify({ nope: true }), { status: 200 })),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof LlmProviderMalformedResponseError
    );
  });

  it('invalid JSON response → LlmProviderMalformedResponseError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() => new Response('not-json', { status: 200 })),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof LlmProviderMalformedResponseError
    );
  });

  it('empty response → LlmProviderEmptyResponseError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() =>
        new Response(JSON.stringify(createSuccessResponse('   ')), { status: 200 })
      ),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof LlmProviderEmptyResponseError
    );
  });

  it('HTTP 500 → LlmProviderHttpError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() => new Response('Internal Server Error', { status: 500 })),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof LlmProviderHttpError && error.status === 500
    );
  });

  it('timeout → LlmProviderTimeoutError', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      timeoutMs: 20,
      fetchImpl: createFakeFetch((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
          });
        });
      }),
    });

    await assert.rejects(
      () => provider.generateText(createSampleRequest()),
      (error: unknown) => error instanceof LlmProviderTimeoutError
    );
  });

  it('tokenUsage mapowane poprawnie', async () => {
    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() =>
        new Response(
          JSON.stringify(
            createSuccessResponse('Token mapped reply.', {
              prompt_tokens: 88,
              completion_tokens: 22,
              total_tokens: 110,
            })
          ),
          { status: 200 }
        )
      ),
    });

    const result = await provider.generateText(createSampleRequest());

    assert.deepEqual(result.tokenUsage, {
      promptTokens: 88,
      completionTokens: 22,
      totalTokens: 110,
    });
  });

  it('provider nie mutuje input request', async () => {
    const request = createSampleRequest();
    const snapshot = JSON.stringify(request);

    const provider = createOpenAiLlmProvider({
      apiKey: 'test-key',
      fetchImpl: createFakeFetch(() =>
        new Response(JSON.stringify(createSuccessResponse('Immutable request.')), { status: 200 })
      ),
    });

    await provider.generateText(request);

    assert.equal(JSON.stringify(request), snapshot);
  });

  it('providerId = openai', () => {
    const provider = createOpenAiLlmProvider({ apiKey: 'test-key' });
    assert.equal(provider.providerId, 'openai');
  });

  it('buildRequestBody nie mutuje request', () => {
    const request = createSampleRequest();
    const snapshot = JSON.stringify(request);
    buildRequestBody(request, 'gpt-4o-mini');
    assert.equal(JSON.stringify(request), snapshot);
  });

  it('parseOpenAiResponse mapuje finishReason length', () => {
    const result = parseOpenAiResponse(
      {
        choices: [{ message: { content: 'Truncated.' }, finish_reason: 'length' }],
      },
      'gpt-4o-mini',
      12
    );

    assert.equal(result.finishReason, 'length');
    assert.equal(result.text, 'Truncated.');
  });
});
