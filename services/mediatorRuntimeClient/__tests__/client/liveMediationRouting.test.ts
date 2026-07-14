/**
 * Live mediation engine routing — unit tests (Phase 2K).
 *
 *   npm run test:mediator:client
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildLiveRuntimeTurnInput,
  logMediatorRuntimeRolloutFailure,
  routeLiveMediatorTurn,
  toRuntimeLanguage,
} from '@/services/mediatorRuntimeClient/liveMediationBridge';
import { MediatorRuntimeClientError } from '@/services/mediatorRuntimeClient/errors';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';

const BASE_PARAMS = {
  mediationId: 'med-live-1',
  sessionId: 'med-live-1',
  triggerMessageId: 'msg-1',
  triggerContent: 'I feel unheard when plans change.',
  triggerCreatedAt: '2026-07-06T12:00:00.000Z',
  mode: 'answer_ack' as const,
  senderRole: 'partner' as const,
  language: 'it',
  turnNumber: 4,
};

describe('buildLiveRuntimeTurnInput', () => {
  it('passes language from live flow input', () => {
    const input = buildLiveRuntimeTurnInput(BASE_PARAMS);
    assert.equal(input.language, 'it');
    assert.equal(buildMediatorRuntimeRequest(input).language, 'it');
  });

  it('falls back to en when language is missing or invalid', () => {
    assert.equal(buildLiveRuntimeTurnInput({ ...BASE_PARAMS, language: undefined }).language, 'en');
    assert.equal(buildLiveRuntimeTurnInput({ ...BASE_PARAMS, language: 'xx' }).language, 'en');
  });

  it('passes null mediationState and sessionMemory when not provided', () => {
    const input = buildLiveRuntimeTurnInput(BASE_PARAMS);
    assert.equal(input.mediationState, null);
    assert.equal(input.sessionMemory, null);
  });

  it('does not synthesize state when explicitly null', () => {
    const input = buildLiveRuntimeTurnInput({
      ...BASE_PARAMS,
      mediationState: null,
      sessionMemory: null,
    });
    assert.equal(input.mediationState, null);
    assert.equal(input.sessionMemory, null);
  });

  it('maps host answer_ack to partner_message trigger (not host_generate)', () => {
    const input = buildLiveRuntimeTurnInput({
      ...BASE_PARAMS,
      mode: 'answer_ack',
      senderRole: 'user',
    });
    assert.equal(input.trigger, 'partner_message');
    assert.equal(input.transcriptDelta[0]?.authorRole, 'host');
  });

  it('maps partner answer_ack to partner_message trigger', () => {
    const input = buildLiveRuntimeTurnInput(BASE_PARAMS);
    assert.equal(input.trigger, 'partner_message');
    assert.equal(input.transcriptDelta.length, 1);
    assert.equal(input.transcriptDelta[0]?.authorRole, 'partner');
  });

  it('maps opening_summary bootstrap to session_start with empty transcript', () => {
    const input = buildLiveRuntimeTurnInput({
      ...BASE_PARAMS,
      mode: 'opening_summary',
      triggerContent: '',
      isBootstrap: true,
    });
    assert.equal(input.trigger, 'session_start');
    assert.deepEqual(input.transcriptDelta, []);
  });

  it('maps runtime generation modes to host_generate trigger', () => {
    for (const mode of [
      'extension_offer',
      'extension_question',
      'closure',
      'safety_intervention',
    ] as const) {
      const input = buildLiveRuntimeTurnInput({ ...BASE_PARAMS, mode, triggerContent: '' });
      assert.equal(input.trigger, 'host_generate', mode);
    }
  });
});

describe('routeLiveMediatorTurn', () => {
  it('calls runtime and returns result', async () => {
    let runtimeCalls = 0;

    const result = await routeLiveMediatorTurn(
      buildLiveRuntimeTurnInput(BASE_PARAMS),
      {
        callRuntime: async () => {
          runtimeCalls += 1;
          return { source: 'runtime_available' };
        },
        onRuntimeFailure: () => {},
      }
    );

    assert.deepEqual(result, { source: 'runtime_available' });
    assert.equal(runtimeCalls, 1);
  });

  it('throws and invokes onRuntimeFailure when runtime throws', async () => {
    const failures: unknown[] = [];

    await assert.rejects(
      () =>
        routeLiveMediatorTurn(
          buildLiveRuntimeTurnInput(BASE_PARAMS),
          {
            callRuntime: async () => {
              throw new MediatorRuntimeClientError('network', 'offline', { retryable: true });
            },
            onRuntimeFailure: (error) => failures.push(error),
          }
        ),
      MediatorRuntimeClientError
    );

    assert.equal(failures.length, 1);
  });
});

describe('logMediatorRuntimeRolloutFailure', () => {
  it('is a no-op without logger and does not throw', () => {
    const secret = 'secret transcript content about private feelings';
    assert.doesNotThrow(() =>
      logMediatorRuntimeRolloutFailure(
        new MediatorRuntimeClientError('http', secret, {
          status: 500,
          retryable: true,
          cause: secret,
        })
      )
    );
  });

  it('passes sanitized payload to logger without transcript or error message', () => {
    const secret = 'secret transcript content about private feelings';
    const payloads: Array<{
      enginePath: 'runtime';
      kind: string;
      status?: number;
    }> = [];

    logMediatorRuntimeRolloutFailure(
      new MediatorRuntimeClientError('http', secret, {
        status: 500,
        retryable: true,
        cause: secret,
      }),
      (payload) => payloads.push(payload)
    );

    assert.equal(payloads.length, 1);
    assert.deepEqual(payloads[0], {
      enginePath: 'runtime',
      kind: 'http',
      status: 500,
    });
    assert.ok(!JSON.stringify(payloads[0]).includes(secret));
  });
});

describe('toRuntimeLanguage', () => {
  it('supports all mediator runtime languages', () => {
    assert.equal(toRuntimeLanguage('de'), 'de');
    assert.equal(toRuntimeLanguage('fr'), 'fr');
  });

  it('does not default to pl', () => {
    assert.equal(toRuntimeLanguage(null), 'en');
    assert.notEqual(toRuntimeLanguage(null), 'pl');
  });
});
