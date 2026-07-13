import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countMediatorQuestions,
  resolveQuestionTurnFromMessages,
} from '@/services/mediatorRuntimeClient/resolveQuestionTurnFromMessages';
import {
  deriveParticipantReplyStateFromMessages,
  type ParticipantReplyMessage,
} from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

const HOST_ID = 'host-user-1111-1111-1111-111111111111';
const PARTNER_ID = 'partner-user-2222-2222-2222-222222222222';

function aiQuestion(id: string): ParticipantReplyMessage {
  return { id, sender_id: 'ai', message_type: 'question' };
}

function hostReply(id: string): ParticipantReplyMessage {
  return { id, sender_id: HOST_ID, message_type: 'message' };
}

function partnerReply(id: string): ParticipantReplyMessage {
  return { id, sender_id: PARTNER_ID, message_type: 'message' };
}

describe('resolveQuestionTurnFromMessages', () => {
  it('uses message count when runtime turnOrdinal lags behind', () => {
    const messages = [
      aiQuestion('q-1'),
      hostReply('h-1'),
      partnerReply('p-1'),
      aiQuestion('q-2'),
      hostReply('h-2'),
      partnerReply('p-2'),
      aiQuestion('q-3'),
      hostReply('h-3'),
      partnerReply('p-3'),
    ];

    assert.equal(countMediatorQuestions(messages), 3);
    assert.equal(resolveQuestionTurnFromMessages(messages, 2), 3);
  });

  it('derive ignores stale turnOrdinal and tags round 3 client events correctly', () => {
    const messages = [
      aiQuestion('q-1'),
      hostReply('h-1'),
      partnerReply('p-1'),
      aiQuestion('q-2'),
      hostReply('h-2'),
      partnerReply('p-2'),
      aiQuestion('q-3'),
      hostReply('h-3'),
      partnerReply('p-3'),
    ];

    const derived = deriveParticipantReplyStateFromMessages({
      messages,
      currentQuestionTurn: 2,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.questionTurn, 3);
    assert.equal(derived.bothReplied, true);
    assert.equal(derived.lastMediatorQuestionId, 'q-3');
  });
});
