/**
 * mediatorRuntimeClient — unit tests (Phase 2J).
 *
 *   npm run test:mediator:client
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import { createClientInputFixture } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';

describe('buildMediatorRuntimeRequest', () => {
  it('builds Edge-compatible body with required fields', () => {
    const input = createClientInputFixture();
    const body = buildMediatorRuntimeRequest(input);

    assert.equal(body.mediationId, 'med-1');
    assert.equal(body.sessionId, 'sess-1');
    assert.equal(body.turnNumber, 3);
    assert.equal(body.trigger, 'partner_message');
    assert.equal(body.language, 'en');
    assert.equal(body.engineVersion, MEDIATOR_RUNTIME_ENGINE_VERSION);
    assert.equal(body.mediationState, null);
    assert.equal(body.sessionMemory, null);
    assert.equal(body.transcriptDelta.length, 1);
    assert.equal(body.transcriptDelta[0]?.content, 'I feel unheard.');
    assert.deepEqual(body.clientEvents, []);
  });

  it('passes clientEvents through when provided', () => {
    const events = [
      {
        kind: 'proposal_rejected' as const,
        actor: 'partner' as const,
        at: '2026-07-11T12:00:00.000Z',
      },
    ];
    const body = buildMediatorRuntimeRequest({
      ...createClientInputFixture(),
      clientEvents: events,
    });

    assert.deepEqual(body.clientEvents, events);
  });

  it('defaults engineVersion to v2.3', () => {
    const body = buildMediatorRuntimeRequest(createClientInputFixture());
    assert.equal(body.engineVersion, 'v2.3');
  });

  it('preserves provided mediationState and sessionMemory', () => {
    const mediationState = { meta: { language: 'pl' } } as never;
    const sessionMemory = { version: '2.3' } as never;
    const body = buildMediatorRuntimeRequest({
      ...createClientInputFixture(),
      mediationState,
      sessionMemory,
    });

    assert.equal(body.mediationState, mediationState);
    assert.equal(body.sessionMemory, sessionMemory);
  });
});
