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
import { motherInLawConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/mother-in-law';
import { socialMediaConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/social-media';
import { exPartnerConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/ex-partner';
import { sexIntimacyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/sex-intimacy';
import { lackOfClosenessConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-closeness';
import { parentingDifferencesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/parenting-differences';
import { workOverFamilyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/work-over-family';
import { relocationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/relocation';
import { filterParticipantMessages } from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import { runGoldenConversation } from '@/services/mediatorEngine/evaluation/runGoldenConversation';

const PILOT_CONVERSATIONS = [
  financesBlameConversation,
  householdChoresConversation,
  lackOfCommunicationConversation,
  silenceAfterConflictConversation,
  jealousyConversation,
  motherInLawConversation,
  socialMediaConversation,
  exPartnerConversation,
  sexIntimacyConversation,
  lackOfClosenessConversation,
  parentingDifferencesConversation,
  workOverFamilyConversation,
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

  it('relocation: SKIPPED when messages_missing', async () => {
    const result = await runGoldenConversation(relocationConversation);

    assert.equal(result.status, 'SKIPPED');
    assert.equal(result.skipReason, 'messages_missing');
    assert.equal(result.executedTurns, 0);
    assert.equal(result.turns.length, 0);
  });
});

describe('runGoldenConversation — explainability wiring', () => {
  const SKELETON_TRACE_SIGNATURE = {
    strategy: 'build_safety',
    interventionType: 'welcome_open',
    goalTransition: 'stay',
  } as const;

  it('finances-blame: trace reflects real pipeline outputs', async () => {
    const result = await runGoldenConversation(financesBlameConversation);

    assert.equal(result.status, 'PASS', result.failureReason ?? 'expected PASS');
    assert.equal(result.turns.length, 4);

    const turn1 = result.turns[0];
    assert.equal(turn1.goalTransition, 'stay');
    assert.equal(turn1.strategy, 'hold_space');
    assert.equal(turn1.currentGoal, 'SAFE_OPENING');
    assert.equal(turn1.mediationState.currentGoal, 'SAFE_OPENING');

    const turn2 = result.turns[1];
    assert.equal(turn2.goalTransition, 'advance');
    assert.equal(turn2.mediationState.currentGoal, 'EMOTION_NAMING');
    assert.equal(turn2.currentGoal, 'EMOTION_NAMING');

    const turn3 = result.turns[2];
    assert.notEqual(turn3.mediationState.currentGoal, 'SAFE_OPENING');
    assert.equal(turn3.mediationState.currentGoal, turn3.currentGoal);

    const allSafeOpening = result.turns.every(
      (trace) => trace.mediationState.currentGoal === 'SAFE_OPENING'
    );
    assert.equal(allSafeOpening, false, 'trace should not stay on SAFE_OPENING for every turn');

    const allSkeleton = result.turns.every(
      (trace) =>
        trace.strategy === SKELETON_TRACE_SIGNATURE.strategy &&
        trace.interventionType === SKELETON_TRACE_SIGNATURE.interventionType &&
        trace.goalTransition === SKELETON_TRACE_SIGNATURE.goalTransition
    );
    assert.equal(allSkeleton, false, 'trace should not be skeleton for every turn');

    const hasAdvance = result.turns.some((trace) => trace.goalTransition === 'advance');
    assert.equal(hasAdvance, true, 'at least one turn should advance');
  });
});
