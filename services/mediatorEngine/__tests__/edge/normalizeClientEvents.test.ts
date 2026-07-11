/**
 * Client events normalization — unit tests (Phase UI-B.3d.1 / UI-B.3d.1a / UI-B.3d.1b).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isValidRuntimeClientEvent,
  MAX_CLIENT_EVENTS,
  normalizeClientEvents,
  parseClientEventsFromRequest,
} from '@/services/mediatorEngine/edge/normalizeClientEvents';
import { parseMediatorRuntimeRequest, toOrchestrateTurnRequest } from '@/services/mediatorEngine/edge/request';
import { safeRuntimeInput } from '@/services/mediatorEngine/runtime/lib/safeRuntimeInput';

const validEvent = {
  kind: 'continue_session' as const,
  actor: 'host' as const,
  at: '2026-07-11T12:00:00.000Z',
};

describe('isValidRuntimeClientEvent', () => {
  it('accepts valid client events', () => {
    assert.equal(
      isValidRuntimeClientEvent({
        kind: 'continue_session',
        actor: 'host',
        at: '2026-07-11T12:00:00.000Z',
        metadata: { summaryId: 'sum-1' },
      }),
      true
    );
    assert.equal(
      isValidRuntimeClientEvent({
        kind: 'proposal_accepted',
        actor: 'partner',
        at: '2026-07-11T12:01:00.000Z',
      }),
      true
    );
  });

  it('rejects invalid shapes', () => {
    assert.equal(isValidRuntimeClientEvent(null), false);
    assert.equal(isValidRuntimeClientEvent('event'), false);
    assert.equal(
      isValidRuntimeClientEvent({ kind: 'not_a_kind', actor: 'host', at: 't' }),
      false
    );
    assert.equal(
      isValidRuntimeClientEvent({ kind: 'continue_session', actor: 'guest', at: 't' }),
      false
    );
    assert.equal(
      isValidRuntimeClientEvent({ kind: 'continue_session', actor: 'host', at: '   ' }),
      false
    );
    assert.equal(
      isValidRuntimeClientEvent({
        kind: 'continue_session',
        actor: 'host',
        at: 't',
        metadata: null,
      }),
      false
    );
  });
});

describe('normalizeClientEvents', () => {
  it('returns empty array for null and undefined', () => {
    assert.deepEqual(normalizeClientEvents(undefined), []);
    assert.deepEqual(normalizeClientEvents(null), []);
  });

  it('accepts valid client events and trims at', () => {
    const events = normalizeClientEvents([
      {
        kind: 'continue_session',
        actor: 'host',
        at: '  2026-07-11T12:00:00.000Z  ',
        metadata: { summaryId: 'sum-1' },
      },
      {
        kind: 'proposal_accepted',
        actor: 'partner',
        at: '2026-07-11T12:01:00.000Z',
      },
    ]);

    assert.notEqual(events, 'invalid');
    if (events !== 'invalid') {
      assert.equal(events.length, 2);
      assert.equal(events[0]?.kind, 'continue_session');
      assert.equal(events[0]?.at, '2026-07-11T12:00:00.000Z');
      assert.equal(events[0]?.metadata?.summaryId, 'sum-1');
      assert.equal(events[1]?.actor, 'partner');
    }
  });

  it('rejects non-array values', () => {
    assert.equal(normalizeClientEvents('invalid'), 'invalid');
    assert.equal(normalizeClientEvents({ kind: 'continue_session' }), 'invalid');
  });

  it('rejects arrays with any invalid entry (atomic contract)', () => {
    assert.equal(
      normalizeClientEvents([
        { kind: 'not_a_kind', actor: 'host', at: '2026-07-11T12:00:00.000Z' },
        { kind: 'resolve_session', actor: 'partner', at: '2026-07-11T12:00:01.000Z' },
      ]),
      'invalid'
    );
  });

  it(`rejects arrays longer than MAX_CLIENT_EVENTS (${MAX_CLIENT_EVENTS})`, () => {
    const tooMany = Array.from({ length: MAX_CLIENT_EVENTS + 1 }, () => validEvent);
    assert.equal(normalizeClientEvents(tooMany), 'invalid');
  });

  it(`accepts exactly MAX_CLIENT_EVENTS (${MAX_CLIENT_EVENTS}) valid entries`, () => {
    const atLimit = Array.from({ length: MAX_CLIENT_EVENTS }, () => validEvent);
    const events = normalizeClientEvents(atLimit);
    assert.equal(Array.isArray(events) ? events.length : -1, MAX_CLIENT_EVENTS);
  });
});

describe('parseClientEventsFromRequest', () => {
  it('uses the same strict contract as normalizeClientEvents', () => {
    assert.deepEqual(parseClientEventsFromRequest(undefined), []);
    assert.equal(parseClientEventsFromRequest('invalid'), 'invalid');
    assert.deepEqual(parseClientEventsFromRequest([validEvent]), normalizeClientEvents([validEvent]));
  });
});

describe('safeRuntimeInput clientEvents', () => {
  it('falls back to [] when clientEvents fail strict validation', () => {
    const ctx = safeRuntimeInput({
      turnInput: {
        mediationId: 'med-1',
        sessionId: 'sess-1',
        trigger: 'partner_message',
        turnNumber: 1,
        mediationState: null,
        transcriptDelta: [],
        engineVersion: 'v2.3',
        clientEvents: [
          validEvent,
          { kind: 'not_a_kind', actor: 'host', at: '2026-07-11T12:00:01.000Z' },
        ],
      },
    });

    assert.deepEqual(ctx.turnInput.clientEvents, []);
  });
});

describe('parseMediatorRuntimeRequest clientEvents', () => {
  const baseBody = {
    mediationId: 'med-1',
    sessionId: 'sess-1',
    turnNumber: 2,
    trigger: 'partner_message',
    mediationState: null,
    sessionMemory: null,
    transcriptDelta: [],
    language: 'en',
    engineVersion: 'v2.3',
  };

  it('defaults clientEvents to [] when omitted', () => {
    const parsed = parseMediatorRuntimeRequest(baseBody);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.value.clientEvents, []);
    }
  });

  it('passes validated clientEvents through to OrchestrateTurnRequest', () => {
    const parsed = parseMediatorRuntimeRequest({
      ...baseBody,
      clientEvents: [
        {
          kind: 'start_extension',
          actor: 'host',
          at: '2026-07-11T12:00:00.000Z',
        },
      ],
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const turnInput = toOrchestrateTurnRequest(parsed.value);
      assert.equal(turnInput.clientEvents?.length, 1);
      assert.equal(turnInput.clientEvents?.[0]?.kind, 'start_extension');
    }
  });

  it('returns 400 when clientEvents is not an array', () => {
    const parsed = parseMediatorRuntimeRequest({
      ...baseBody,
      clientEvents: { kind: 'continue_session' },
    });

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, 'invalid_client_events');
      assert.equal(parsed.status, 400);
    }
  });

  it('returns 400 when clientEvents contains an invalid entry', () => {
    const parsed = parseMediatorRuntimeRequest({
      ...baseBody,
      clientEvents: [
        validEvent,
        { kind: 'not_a_kind', actor: 'host', at: '2026-07-11T12:00:01.000Z' },
      ],
    });

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, 'invalid_client_events');
      assert.equal(parsed.status, 400);
    }
  });

  it(`returns 400 when clientEvents exceeds ${MAX_CLIENT_EVENTS} entries`, () => {
    const parsed = parseMediatorRuntimeRequest({
      ...baseBody,
      clientEvents: Array.from({ length: MAX_CLIENT_EVENTS + 1 }, () => validEvent),
    });

    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error.code, 'invalid_client_events');
      assert.equal(parsed.status, 400);
    }
  });
});
