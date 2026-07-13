import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveParticipantReplyStateFromMessages,
  type ParticipantReplyMessage,
} from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

const HOST_ID = 'host-user-1111-1111-1111-111111111111';
const PARTNER_ID = 'partner-user-2222-2222-2222-222222222222';

function aiQuestion(id = 'q-ai-1'): ParticipantReplyMessage {
  return {
    id,
    sender_id: 'ai',
    message_type: 'question',
  };
}

function hostReply(id = 'host-reply-1', replyToQuestionId?: string): ParticipantReplyMessage {
  return {
    id,
    sender_id: HOST_ID,
    message_type: 'message',
    metadata: replyToQuestionId ? { replyToQuestionId } : {},
  };
}

function partnerReply(id = 'partner-reply-1', replyToQuestionId?: string): ParticipantReplyMessage {
  return {
    id,
    sender_id: PARTNER_ID,
    message_type: 'message',
    metadata: replyToQuestionId ? { replyToQuestionId } : {},
  };
}

describe('deriveParticipantReplyStateFromMessages gate', () => {
  it('host-only → bothReplied false, triggerReason host_only', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [aiQuestion(), hostReply()],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.hostReplied, true);
    assert.equal(derived.partnerReplied, false);
    assert.equal(derived.bothReplied, false);
    assert.equal(derived.triggerReason, 'host_only');
    assert.equal(derived.hostReplyMessageId, 'host-reply-1');
    assert.equal(derived.partnerReplyMessageId, null);
  });

  it('partner-only → bothReplied false, triggerReason partner_only', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [aiQuestion(), partnerReply()],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.hostReplied, false);
    assert.equal(derived.partnerReplied, true);
    assert.equal(derived.bothReplied, false);
    assert.equal(derived.triggerReason, 'partner_only');
  });

  it('host+partner same round → bothReplied true, exactly one reply id each', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [aiQuestion(), hostReply(), partnerReply()],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.bothReplied, true);
    assert.equal(derived.triggerReason, 'both_replied_same_question');
    assert.equal(derived.hostReplyMessageId, 'host-reply-1');
    assert.equal(derived.partnerReplyMessageId, 'partner-reply-1');
  });

  it('ignores stale partner reply from previous question round', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [
        aiQuestion('q-1'),
        hostReply('host-old', 'q-1'),
        partnerReply('partner-old', 'q-1'),
        aiQuestion('q-2'),
        hostReply('host-new', 'q-2'),
      ],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.hostReplied, true);
    assert.equal(derived.partnerReplied, false);
    assert.equal(derived.bothReplied, false);
    assert.equal(derived.lastMediatorQuestionId, 'q-2');
    assert.equal(derived.hostReplyMessageId, 'host-new');
  });

  it('ignores replies bound to a different question id', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [
        aiQuestion('q-2'),
        hostReply('host-wrong', 'q-1'),
        partnerReply('partner-wrong', 'q-1'),
      ],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.bothReplied, false);
    assert.equal(derived.triggerReason, 'awaiting_replies');
  });

  it('does not count AI messages or non-message types as replies', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [
        aiQuestion(),
        {
          id: 'ai-echo',
          sender_id: 'ai',
          message_type: 'message',
        },
        {
          id: 'host-hint',
          sender_id: HOST_ID,
          message_type: 'hint',
        },
        partnerReply(),
      ],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.hostReplied, false);
    assert.equal(derived.partnerReplied, true);
    assert.equal(derived.bothReplied, false);
  });

  it('does not treat host as partner when host id is duplicated in partnerUserIds', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [aiQuestion(), hostReply()],
      hostUserId: HOST_ID,
      partnerUserIds: [HOST_ID, PARTNER_ID],
    });

    assert.equal(derived.hostReplied, true);
    assert.equal(derived.partnerReplied, false);
    assert.equal(derived.bothReplied, false);
  });

  it('ignores non-AI question checkpoints', () => {
    const derived = deriveParticipantReplyStateFromMessages({
      messages: [
        aiQuestion('q-ai'),
        hostReply('host-1', 'q-ai'),
        {
          id: 'user-question',
          sender_id: HOST_ID,
          message_type: 'question',
        },
      ],
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });

    assert.equal(derived.lastMediatorQuestionId, 'q-ai');
    assert.equal(derived.hostReplied, true);
    assert.equal(derived.partnerReplied, false);
  });
});
