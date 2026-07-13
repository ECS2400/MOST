/**
 * Two independent clients — participant reply sync from live_messages.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildParticipantReplyClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import { buildParticipantReplyClientEventsFromMessages } from '@/services/mediatorRuntimeClient/buildParticipantReplyClientEventsFromMessages';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { resolveRuntimeClientEventsForTurn } from '@/services/mediatorRuntimeClient/resolveRuntimeClientEventsForTurn';
import {
  applyDerivedParticipantRepliesToFlowControl,
  bothParticipantRepliesSatisfied,
  patchRuntimeSessionAfterBothReplies,
  resetParticipantRepliesForQuestion,
} from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { runtimeAwaitingBothRepliesFixture } from '@/services/mediatorRuntimeClient/__tests__/client/runtimeSessionFixtures';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

const HOST_ID = 'host-user-1111-1111-1111-111111111111';
const PARTNER_ID = 'partner-user-2222-2222-2222-222222222222';
const MEDIATION_ID = 'med-two-client';
const QUESTION_TURN = 2;

function questionMessage(): ParticipantReplyMessage {
  return {
    id: 'q-1',
    mediation_id: MEDIATION_ID,
    sender_id: 'ai',
    sender_name: 'Mediator',
    content: 'What happened?',
    message_type: 'question',
    is_private: false,
    recipient_id: null,
    phase: QUESTION_TURN,
    metadata: { questionId: 'q-meta-1' },
    created_at: '2026-07-13T10:00:00.000Z',
  };
}

function hostReply(): ParticipantReplyMessage {
  return {
    id: 'host-reply-1',
    mediation_id: MEDIATION_ID,
    sender_id: HOST_ID,
    sender_name: 'Host',
    content: 'Host answer',
    message_type: 'message',
    is_private: false,
    recipient_id: null,
    phase: QUESTION_TURN,
    metadata: {},
    created_at: '2026-07-13T10:01:00.000Z',
  };
}

function partnerReply(): ParticipantReplyMessage {
  return {
    id: 'partner-reply-1',
    mediation_id: MEDIATION_ID,
    sender_id: PARTNER_ID,
    sender_name: 'Partner',
    content: 'Partner answer',
    message_type: 'message',
    is_private: false,
    recipient_id: null,
    phase: QUESTION_TURN,
    metadata: {},
    created_at: '2026-07-13T10:02:00.000Z',
  };
}

describe('two-client participant reply architecture', () => {
  it('client A ref has only host_message — not both replies', () => {
    const clientARef = buildParticipantReplyClientEvents('host', QUESTION_TURN);
    assert.deepEqual(clientARef.map((event) => event.kind), ['host_message']);
  });

  it('client B ref has only partner_message — not both replies', () => {
    const clientBRef = buildParticipantReplyClientEvents('partner', QUESTION_TURN);
    assert.deepEqual(clientBRef.map((event) => event.kind), ['partner_message']);
  });

  it('merged live_messages derive both replies regardless of per-device ref', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const derived = deriveParticipantReplyStateFromMessages({
      messages,
      currentQuestionTurn: QUESTION_TURN,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.hostReplied, true);
    assert.equal(derived.partnerReplied, true);
    assert.equal(derived.bothReplied, true);
  });

  it('host device with only local ref still builds both runtime events from messages', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const clientARef = buildParticipantReplyClientEvents('host', QUESTION_TURN);

    const runtimeEvents = resolveRuntimeClientEventsForTurn({
      messages,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
      runtimeSession: runtimeAwaitingBothRepliesFixture(),
      pendingRefEvents: clientARef,
    });

    assert.deepEqual(runtimeEvents?.map((event) => event.kind).sort(), [
      'host_message',
      'partner_message',
    ]);
  });

  it('partner device with only local ref still builds both runtime events from messages', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const clientBRef = buildParticipantReplyClientEvents('partner', QUESTION_TURN);

    const runtimeEvents = resolveRuntimeClientEventsForTurn({
      messages,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
      runtimeSession: runtimeAwaitingBothRepliesFixture(),
      pendingRefEvents: clientBRef,
    });

    assert.deepEqual(runtimeEvents?.map((event) => event.kind).sort(), [
      'host_message',
      'partner_message',
    ]);
  });

  it('after sync bothReplied patches runtime pending to nothing', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const derived = deriveParticipantReplyStateFromMessages({
      messages,
      currentQuestionTurn: QUESTION_TURN,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    const memory = {
      ...createEmptySessionMemory(),
      runtimeFlowControl: {
        ...createDefaultRuntimeFlowControl(),
        participantReplies: resetParticipantRepliesForQuestion(QUESTION_TURN),
      },
    };

    const applied = applyDerivedParticipantRepliesToFlowControl(
      memory.runtimeFlowControl,
      memory,
      derived
    );

    assert.equal(applied.changed, true);
    assert.equal(bothParticipantRepliesSatisfied(applied.flowControl.participantReplies), true);

    const runtime = patchRuntimeSessionAfterBothReplies(runtimeAwaitingBothRepliesFixture());
    assert.equal(runtime.pending.awaiting, 'nothing');
    assert.equal(runtime.decision.nextBeat, 'deliver_question');
    assert.equal(runtime.decision.mayAutoAdvance, true);
  });

  it('partial replies from messages do not unlock runtime', () => {
    const hostOnlyMessages = [questionMessage(), hostReply()];
    const derived = deriveParticipantReplyStateFromMessages({
      messages: hostOnlyMessages,
      currentQuestionTurn: QUESTION_TURN,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.bothReplied, false);
    assert.deepEqual(
      buildParticipantReplyClientEventsFromMessages(derived).map((event) => event.kind),
      ['host_message']
    );
  });

  it('re-sync with unchanged messages is idempotent on flow control', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const derived = deriveParticipantReplyStateFromMessages({
      messages,
      currentQuestionTurn: QUESTION_TURN,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    const memory = {
      ...createEmptySessionMemory(),
      runtimeFlowControl: {
        ...createDefaultRuntimeFlowControl(),
        participantReplies: {
          hostReplied: true,
          partnerReplied: true,
          questionTurn: QUESTION_TURN,
        },
      },
    };

    const second = applyDerivedParticipantRepliesToFlowControl(
      memory.runtimeFlowControl,
      memory,
      derived
    );
    assert.equal(second.changed, false);
  });
});
