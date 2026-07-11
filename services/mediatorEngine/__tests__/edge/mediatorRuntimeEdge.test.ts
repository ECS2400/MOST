/**
 * Mediator Edge runtime — unit tests (Phase 2G).
 *
 *   npm run test:mediator:edge
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import {
  createMediatorRuntimeOptionsResponse,
  MEDIATOR_RUNTIME_CORS_HEADERS,
} from '@/services/mediatorEngine/edge/cors';
import { MEDIATOR_RUNTIME_ERROR_CODES } from '@/services/mediatorEngine/edge/errors';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import { parseMediatorRuntimeRequest } from '@/services/mediatorEngine/edge/request';
import {
  buildMediatorRuntimeEdgeSuccess,
  isMediatorRuntimeResponseSafe,
} from '@/services/mediatorEngine/edge/response';
import { isRuntimeMetadataTranscriptSafe } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createIntegrationInput } from '@/services/mediatorEngine/__tests__/integration/fixtures';

const ROOT = join(process.cwd());

function validRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    mediationId: 'edge-mediation-1',
    sessionId: 'edge-session-1',
    turnNumber: 3,
    trigger: 'partner_message',
    mediationState: null,
    sessionMemory: null,
    transcriptDelta: [
      {
        id: 'edge-msg-1',
        authorRole: 'partner',
        content: 'I feel unheard when plans change without notice.',
        turnNumber: 3,
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ],
    language: 'en',
    engineVersion: 'v2.3',
    ...overrides,
  };
}

describe('mediator-runtime edge — CORS', () => {
  it('OPTIONS response returns 200 with CORS headers', () => {
    const response = createMediatorRuntimeOptionsResponse();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(
      response.headers.get('Access-Control-Allow-Headers'),
      MEDIATOR_RUNTIME_CORS_HEADERS['Access-Control-Allow-Headers']
    );
  });
});

describe('mediator-runtime edge — request validation', () => {
  it('malformed JSON body → ok:false / 400', () => {
    const result = parseMediatorRuntimeRequest(null);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON);
      assert.equal(result.status, 400);
    }
  });

  it('missing mediationId → 400', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), mediationId: '' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, MEDIATOR_RUNTIME_ERROR_CODES.MISSING_MEDIATION_ID);
    }
  });

  it('missing sessionId → 400', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), sessionId: '  ' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, MEDIATOR_RUNTIME_ERROR_CODES.MISSING_SESSION_ID);
    }
  });

  it('missing transcriptDelta → default []', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), transcriptDelta: undefined });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.transcriptDelta, []);
    }
  });

  it('invalid language → fallback en', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), language: 'xx' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.language, 'en');
    }
  });

  it('invalid turnNumber → fallback 1', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), turnNumber: -5 });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.turnNumber, 1);
    }
  });

  it('unsupported engineVersion → 400', () => {
    const result = parseMediatorRuntimeRequest({ ...validRequestBody(), engineVersion: 'v1' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, MEDIATOR_RUNTIME_ERROR_CODES.UNSUPPORTED_ENGINE_VERSION);
    }
  });
});

describe('mediator-runtime edge — runtime handler', () => {
  it('valid v2.3 request ze stub provider → ok:true', async () => {
    const result = await handleMediatorRuntimeTurn(validRequestBody(), {
      llmProviderOverride: createDeterministicStubProvider(),
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.engineVersion, 'v2.3');
      assert.ok(result.finalMediatorMessage.text.length > 0);
      assert.equal(result.finalMediatorMessage.accepted, true);
      assert.ok(result.runtimeSession);
      assert.equal(result.runtimeSession.session.turnOrdinal, result.runtimeMetadata.turnNumber);
    }
  });

  it('response zawiera finalMediatorMessage.text', async () => {
    const result = await handleMediatorRuntimeTurn(validRequestBody(), {
      llmProviderOverride: createDeterministicStubProvider(),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(typeof result.finalMediatorMessage.text === 'string');
      assert.ok(result.finalMediatorMessage.text.length > 0);
    }
  });

  it('response nie zawiera promptComposerOutput', async () => {
    const result = await handleMediatorRuntimeTurn(validRequestBody(), {
      llmProviderOverride: createDeterministicStubProvider(),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(isMediatorRuntimeResponseSafe(result));
      assert.ok(!('promptComposerOutput' in result));
    }
  });

  it('response nie zawiera providerResponse', async () => {
    const result = await handleMediatorRuntimeTurn(validRequestBody(), {
      llmProviderOverride: createDeterministicStubProvider(),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(!('providerResponse' in result));
      assert.ok(!JSON.stringify(result).includes('providerResponse'));
    }
  });

  it('runtimeMetadata nie zawiera raw transcript content', async () => {
    const result = await handleMediatorRuntimeTurn(
      validRequestBody({
        transcriptDelta: [
          {
            id: 'secret-msg',
            authorRole: 'host',
            content: 'Host: secret dialogue content Dialogue marker',
            turnNumber: 3,
            createdAt: '2026-07-05T00:00:00.000Z',
          },
        ],
      }),
      { llmProviderOverride: createDeterministicStubProvider() }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(isRuntimeMetadataTranscriptSafe(result.runtimeMetadata), true);
    }
  });

  it("language=pl → finalMediatorMessage.language='pl'", async () => {
    const result = await handleMediatorRuntimeTurn(
      validRequestBody({ language: 'pl' }),
      { llmProviderOverride: createDeterministicStubProvider() }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.finalMediatorMessage.language, 'pl');
    }
  });

  it("language=en + mediationState=null propaguje en do mediationState.meta.language", async () => {
    const result = await handleMediatorRuntimeTurn(
      validRequestBody({ language: 'en', mediationState: null, turnNumber: 1, trigger: 'session_start' }),
      { llmProviderOverride: createDeterministicStubProvider() }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.finalMediatorMessage.language, 'en');
      assert.equal(result.mediationState.meta.language, 'en');
      assert.equal(result.complianceResult.compliant, true);
    }
  });

  it("language=it + mediationState=null propaguje it do mediationState.meta.language", async () => {
    const result = await handleMediatorRuntimeTurn(
      validRequestBody({ language: 'it', mediationState: null, turnNumber: 1, trigger: 'session_start' }),
      { llmProviderOverride: createDeterministicStubProvider() }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.finalMediatorMessage.language, 'it');
      assert.equal(result.mediationState.meta.language, 'it');
    }
  });

  it('missing OPENAI_API_KEY → controlled error missing_openai_api_key', async () => {
    const result = await handleMediatorRuntimeTurn(validRequestBody(), { env: {} });

    assert.equal(result.ok, false);
    if (!result.ok && 'status' in result) {
      assert.equal(result.error.code, MEDIATOR_RUNTIME_ERROR_CODES.MISSING_OPENAI_API_KEY);
      assert.equal(result.status, 503);
    }
  });

  it('safety L3 transcript → safety-safe message', async () => {
    const result = await handleMediatorRuntimeTurn(
      validRequestBody({
        transcriptDelta: [
          {
            id: 'l3-msg',
            authorRole: 'partner',
            content: 'I want to kill myself tonight',
            turnNumber: 3,
            createdAt: '2026-07-05T00:00:00.000Z',
          },
        ],
      }),
      { llmProviderOverride: createDeterministicStubProvider() }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.finalMediatorMessage.safetyLevel, 'L3_stop');
      assert.match(result.finalMediatorMessage.text, /pause|safety|pauz|bezpiec/i);
    }
  });

  it('buildMediatorRuntimeEdgeSuccess strips prompt fields from runtime output', async () => {
    const runtimeOutput = await runMediatorEngineTurn(createIntegrationInput());
    const edge = buildMediatorRuntimeEdgeSuccess(runtimeOutput);

    assert.ok(isMediatorRuntimeResponseSafe(edge));
    assert.ok(!('llmOutput' in edge));
    assert.ok(!('promptComposerOutput' in edge));
    assert.ok(edge.runtimeSession);
    assert.equal(edge.runtimeSession, runtimeOutput.runtimeSession);
  });
});

describe('mediator-runtime edge — static logging guard', () => {
  const edgeFiles = [
    'supabase/functions/mediator-runtime/index.ts',
    'services/mediatorEngine/edge/handleMediatorRuntimeHttp.ts',
    'services/mediatorEngine/edge/handleMediatorRuntimeTurn.ts',
  ];

  for (const relativePath of edgeFiles) {
    it(`${relativePath} nie używa console.log ani nie loguje prompt/transcript`, () => {
      const source = readFileSync(join(ROOT, relativePath), 'utf8');
      assert.ok(!source.includes('console.log'), `Forbidden console.log in ${relativePath}`);
      assert.ok(!/console\.(log|info|debug).*prompt/i.test(source));
      assert.ok(!/console\.(log|info|debug).*transcript/i.test(source));
    });
  }
});
