/**
 * buildRuntimeClientEvents — unit tests (Phase UI-B.3d.2).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRuntimeClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import { buildLiveRuntimeTurnInput } from '@/services/mediatorRuntimeClient/liveMediationBridge';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { isValidRuntimeClientEvent } from '@/services/mediatorEngine/edge/normalizeClientEvents';

const ISO_TIMESTAMP = '2026-07-11T14:00:00.000Z';

describe('buildRuntimeClientEvents', () => {
  it('creates a valid continue_session event for host', () => {
    const events = buildRuntimeClientEvents('continue_session', 'host', ISO_TIMESTAMP);

    assert.equal(events.length, 1);
    assert.equal(events[0]?.kind, 'continue_session');
    assert.equal(events[0]?.actor, 'host');
    assert.equal(events[0]?.at, ISO_TIMESTAMP);
    assert.equal(isValidRuntimeClientEvent(events[0]), true);
  });

  it('creates a valid proposal_rejected event for partner', () => {
    const events = buildRuntimeClientEvents('proposal_rejected', 'partner', ISO_TIMESTAMP);

    assert.equal(events.length, 1);
    assert.equal(events[0]?.kind, 'proposal_rejected');
    assert.equal(events[0]?.actor, 'partner');
    assert.equal(isValidRuntimeClientEvent(events[0]), true);
  });

  it('uses an ISO-8601 timestamp by default', () => {
    const events = buildRuntimeClientEvents('resolve_session', 'host');
    assert.match(events[0]?.at ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('maps all decision-panel actions', () => {
    const actions = [
      'continue_session',
      'start_extension',
      'proposal_accepted',
      'proposal_rejected',
      'resolve_session',
    ] as const;

    for (const action of actions) {
      const events = buildRuntimeClientEvents(action, 'host', ISO_TIMESTAMP);
      assert.equal(events[0]?.kind, action);
      assert.equal(isValidRuntimeClientEvent(events[0]), true);
    }
  });
});

describe('buildRuntimeClientEvents request wiring', () => {
  it('includes clientEvents in the runtime request body', () => {
    const clientEvents = buildRuntimeClientEvents('start_extension', 'host', ISO_TIMESTAMP);
    const request = buildMediatorRuntimeRequest(
      buildLiveRuntimeTurnInput({
        mediationId: 'med-1',
        sessionId: 'sess-1',
        triggerMessageId: 'trigger-1',
        triggerContent: '',
        triggerCreatedAt: ISO_TIMESTAMP,
        mode: 'generate_question',
        senderRole: 'user',
        language: 'en',
        turnNumber: 3,
        clientEvents,
      })
    );

    assert.deepEqual(request.clientEvents, clientEvents);
  });

  it('defaults clientEvents to [] when none are provided', () => {
    const request = buildMediatorRuntimeRequest(
      buildLiveRuntimeTurnInput({
        mediationId: 'med-1',
        sessionId: 'sess-1',
        triggerMessageId: 'trigger-1',
        triggerContent: 'hello',
        triggerCreatedAt: ISO_TIMESTAMP,
        mode: 'answer_ack',
        senderRole: 'partner',
        language: 'en',
        turnNumber: 2,
      })
    );

    assert.deepEqual(request.clientEvents, []);
  });
});
