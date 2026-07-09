/**
 * Golden Conversation E2E Trace Snapshot — integration tests (Phase 4D).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/goldenTraceSnapshot.test.ts
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
import { evaluateGoalProgression } from '@/services/mediatorEngine/evaluation/goalProgression';
import { filterParticipantMessages } from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import { runGoldenConversation } from '@/services/mediatorEngine/evaluation/runGoldenConversation';
import { formatConversationTrace } from '@/services/mediatorEngine/evaluation/viewer';

const PILOT_CONVERSATIONS = [
  financesBlameConversation,
  householdChoresConversation,
  lackOfCommunicationConversation,
  silenceAfterConflictConversation,
  jealousyConversation,
  motherInLawConversation,
  socialMediaConversation,
  exPartnerConversation,
] as const;

const REQUIRED_TRACE_SECTIONS = [
  '# Golden Conversation:',
  'Status: PASS',
  '## Goal Progression',
  '## Turn 1',
  'Speaker:',
  'Input:',
  'Goal:',
  'Strategy:',
  'Intervention:',
  'Transition:',
  'Safety:',
  'Compliance:',
  'Mediator:',
] as const;

describe('goldenTraceSnapshot — E2E trace', () => {
  for (const conversation of PILOT_CONVERSATIONS) {
    it(`${conversation.id}: produces full text trace`, async () => {
      const run = await runGoldenConversation(conversation);

      assert.equal(run.status, 'PASS', run.failureReason ?? 'expected PASS');

      const goalEvaluation = evaluateGoalProgression(run, conversation);
      const output = formatConversationTrace(conversation, run, goalEvaluation);

      for (const section of REQUIRED_TRACE_SECTIONS) {
        assert.match(output, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }

      assert.match(output, new RegExp(conversation.id));

      const participantMessages = filterParticipantMessages(conversation.messages!);
      const hasInputMessage = participantMessages.some((message) => output.includes(message.text));
      assert.equal(hasInputMessage, true, 'trace should include at least one input message from golden data');

      assert.ok(output.length > 500, `trace too short (${output.length} chars)`);
    });
  }

  it('sex-intimacy: SKIPPED trace without turn sections', async () => {
    const run = await runGoldenConversation(sexIntimacyConversation);

    assert.equal(run.status, 'SKIPPED');
    assert.equal(run.skipReason, 'messages_missing');

    const output = formatConversationTrace(sexIntimacyConversation, run);

    assert.match(output, /Status: SKIPPED/);
    assert.match(output, /messages_missing/);
    assert.doesNotMatch(output, /## Turn 1/);
    assert.doesNotMatch(output, /## Goal Progression/);
  });
});
