import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildApplyAiTurnDevLogPayload,
  silentSyncDetectedNewMessages,
} from '@/services/mediatorRuntimeClient/applyAiTurnDevLog';
import {
  buildMediatorTurnFingerprint,
  isDuplicateMediatorTurnFingerprint,
} from '@/services/mediatorRuntimeClient/mediatorTurnFingerprint';
import {
  hasMediatorOpeningDelivered,
  shouldSkipOpeningBootstrap,
} from '@/services/mediatorRuntimeClient/openingBootstrapGuards';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { createRuntimeSessionFixture } from '@/services/mediatorRuntimeClient/__tests__/client/runtimeSessionFixtures';

function runtimeAwaitingBothReplies(): RuntimeSession {
  return createRuntimeSessionFixture();
}

function aiQuestion(id: string, content: string) {
  return {
    id,
    sender_id: 'ai',
    sender_name: 'Mediator AI',
    content,
    message_type: 'question',
    metadata: {},
  };
}

describe('shouldSkipOpeningBootstrap — runtime welcome question', () => {
  it('skips bootstrap when runtime stub welcome question already exists', () => {
    const messages = [
      aiQuestion(
        'q-1',
        'Słyszę, że to jest trudne dla was obojga. Zatrzymajmy się na chwilę i mówcie po kolei.'
      ),
    ];

    assert.equal(hasMediatorOpeningDelivered(messages), true);
    assert.equal(shouldSkipOpeningBootstrap(messages), true);
  });
});

describe('mediatorTurnFingerprint', () => {
  const runtimeSession = runtimeAwaitingBothReplies();

  it('blocks duplicate fingerprint for identical state', () => {
    const messages = [aiQuestion('q-1', 'Pytanie')];
    const fingerprint = buildMediatorTurnFingerprint({
      mediationId: 'med-1',
      mode: 'opening_summary',
      messages,
      runtimeSession,
    });

    assert.equal(isDuplicateMediatorTurnFingerprint(fingerprint, fingerprint), true);
    assert.equal(isDuplicateMediatorTurnFingerprint(fingerprint, null), false);
  });

  it('allows generation after partner reply changes message ids', () => {
    const before = [
      aiQuestion('q-1', 'Pytanie'),
      {
        id: 'host-1',
        sender_id: 'host-1',
        message_type: 'message',
      },
    ];
    const after = [
      ...before,
      {
        id: 'partner-1',
        sender_id: 'partner-1',
        message_type: 'message',
      },
    ];

    const beforeFingerprint = buildMediatorTurnFingerprint({
      mediationId: 'med-1',
      mode: 'generate_question',
      messages: before,
      runtimeSession,
    });
    const afterFingerprint = buildMediatorTurnFingerprint({
      mediationId: 'med-1',
      mode: 'generate_question',
      messages: after,
      runtimeSession,
    });

    assert.notEqual(beforeFingerprint, afterFingerprint);
    assert.equal(isDuplicateMediatorTurnFingerprint(afterFingerprint, beforeFingerprint), false);
  });
});

describe('silent sync without changes', () => {
  it('does not detect new messages when ids and length are unchanged', () => {
    assert.equal(silentSyncDetectedNewMessages(3, 3, 'msg-3', 'msg-3'), false);
  });
});

describe('partial replies do not count as bothAnswered', () => {
  it('host only — bothAnswered false in dev log payload', () => {
    const runtimeSession = runtimeAwaitingBothReplies();
    const messages = [
      aiQuestion('q-1', 'Pytanie'),
      {
        id: 'host-1',
        sender_id: 'host-1',
        message_type: 'message',
      },
    ];

    const payload = buildApplyAiTurnDevLogPayload({
      triggerSource: 'generate_next',
      runtimeSession,
      messages,
      previousMessageCount: 1,
      hostUserId: 'host-1',
      partnerUserIds: ['partner-1'],
      runtimeFailed: false,
    });

    assert.equal(payload.bothAnswered, false);
    assert.equal(payload.pending, 'both_replies');
    assert.equal(payload.nextBeat, 'await_user_action');
  });
});
