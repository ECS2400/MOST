import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * RN must send VOTE optionId from envelope action.id (backend option id),
 * never label / local index / roundIndex.
 */
export function buildEasyChoiceVoteRequest(input: {
  sessionId: string;
  requestId: string;
  actionId: string;
  voteValue: string | null;
}): {
  sessionId: string;
  requestId: string;
  action: { type: 'VOTE'; optionId: string | null; voteValue: string | null };
} {
  return {
    sessionId: input.sessionId,
    requestId: input.requestId,
    action: {
      type: 'VOTE',
      optionId: input.voteValue == null ? input.actionId : null,
      voteValue: input.voteValue,
    },
  };
}

describe('EASY_CHOICES RN vote request', () => {
  it('sends optionId from tile id with voteValue null', () => {
    const body = buildEasyChoiceVoteRequest({
      sessionId: '00000000-0000-4000-8000-000000000001',
      requestId: '00000000-0000-4000-8000-000000000099',
      actionId: 'a',
      voteValue: null,
    });
    assert.equal(body.action.type, 'VOTE');
    assert.equal(body.action.optionId, 'a');
    assert.equal(body.action.voteValue, null);
  });

  it('does not send label or round index as optionId', () => {
    const body = buildEasyChoiceVoteRequest({
      sessionId: '00000000-0000-4000-8000-000000000001',
      requestId: '00000000-0000-4000-8000-000000000099',
      actionId: 'b',
      voteValue: null,
    });
    assert.notEqual(body.action.optionId, 'Tak');
    assert.notEqual(body.action.optionId, '1');
    assert.notEqual(body.action.optionId, 0 as unknown as string);
  });
});
