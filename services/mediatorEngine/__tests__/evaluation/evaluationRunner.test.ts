/**
 * Evaluation Runner — integration tests (Phase 4J).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/evaluationRunner.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
import { recurringArgumentsConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/recurring-arguments';
import { runConversationEvaluation } from '@/services/mediatorEngine/evaluation/runner';

describe('runConversationEvaluation', () => {
  it('returns EvaluationBundle for pilot conversation', async () => {
    const bundle = await runConversationEvaluation(financesBlameConversation);

    assert.equal(bundle.conversationId, financesBlameConversation.id);
    assert.equal(bundle.conversationTitle, financesBlameConversation.title);
    assert.equal(bundle.status, 'PASS');
    assert.ok(bundle.goalEvaluation);
    assert.ok(bundle.strategyEvaluation);
    assert.ok(bundle.safetyEvaluation);
    assert.equal(bundle.interventionEvaluation, undefined);
    assert.equal(bundle.runResult.conversationId, financesBlameConversation.id);
  });

  it('includes interventionEvaluation when expectedInterventions provided', async () => {
    const expectedInterventions = ['validate', 'reflect', 'mirror'] as const;
    const bundle = await runConversationEvaluation(
      financesBlameConversation,
      [...expectedInterventions]
    );

    assert.ok(bundle.interventionEvaluation);
    assert.deepEqual(bundle.interventionEvaluation.expectedInterventions, [...expectedInterventions]);
  });

  it('returns SKIPPED bundle for conversation without messages', async () => {
    const bundle = await runConversationEvaluation(recurringArgumentsConversation);

    assert.equal(bundle.status, 'SKIPPED');
    assert.equal(bundle.conversationId, recurringArgumentsConversation.id);
    assert.ok(bundle.goalEvaluation);
    assert.ok(bundle.strategyEvaluation);
    assert.ok(bundle.safetyEvaluation);
    assert.equal(bundle.interventionEvaluation, undefined);
    assert.equal(bundle.runResult.skipReason, 'messages_missing');
  });
});
