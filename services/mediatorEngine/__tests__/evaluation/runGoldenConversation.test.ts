/**
 * Golden Conversation Runner — integration tests (Phase 4A).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/runGoldenConversation.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
import { householdChoresConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/household-chores';
import { lackOfCommunicationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-communication';
import { silenceAfterConflictConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/silence-after-conflict';
import { jealousyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/jealousy';
import { filterParticipantMessages } from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import { runGoldenConversation } from '@/services/mediatorEngine/evaluation/runGoldenConversation';

const PILOT_CONVERSATIONS = [
  financesBlameConversation,
  householdChoresConversation,
  lackOfCommunicationConversation,
  silenceAfterConflictConversation,
] as const;

describe('runGoldenConversation — pilot golden conversations', () => {
  for (const conversation of PILOT_CONVERSATIONS) {
    it(`${conversation.id}: executes all host/partner turns`, async () => {
      const expectedMessages = filterParticipantMessages(conversation.messages!);
      const result = await runGoldenConversation(conversation);

      assert.equal(result.status, 'PASS', result.failureReason ?? 'expected PASS');
      assert.equal(result.conversationId, conversation.id);
      assert.equal(result.executedTurns, expectedMessages.length);
      assert.equal(result.turns.length, expectedMessages.length);

      for (let index = 0; index < result.turns.length; index += 1) {
        const trace = result.turns[index];
        const expectedMessage = expectedMessages[index];

        assert.equal(trace.turnNumber, index + 1);
        assert.equal(trace.speaker, expectedMessage.speaker);
        assert.equal(trace.inputMessage, expectedMessage.text);
        assert.ok(trace.mediationState);
        assert.ok(trace.sessionMemory);
        assert.ok(trace.finalMediatorMessage);
        assert.ok(trace.compliance);
        assert.equal(trace.mediationState.meta.currentTurnNumber, trace.turnNumber);

        if (index > 0) {
          const previous = result.turns[index - 1];
          assert.equal(
            trace.mediationState.meta.mediationId,
            previous.mediationState.meta.mediationId,
            'mediationState should carry session identity'
          );
          assert.ok(
            trace.sessionMemory.interventionHistory.length >=
              previous.sessionMemory.interventionHistory.length,
            'sessionMemory should carry forward'
          );
        }
      }
    });
  }

  it('jealousy: SKIPPED when messages_missing', async () => {
    const result = await runGoldenConversation(jealousyConversation);

    assert.equal(result.status, 'SKIPPED');
    assert.equal(result.skipReason, 'messages_missing');
    assert.equal(result.executedTurns, 0);
    assert.equal(result.turns.length, 0);
  });
});
