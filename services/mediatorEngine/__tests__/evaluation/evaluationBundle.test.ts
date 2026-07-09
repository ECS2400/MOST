/**
 * Evaluation Bundle — integration tests (Phase 4I).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/evaluationBundle.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
import { lackOfClosenessConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-closeness';
import { buildEvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle';
import { runGoldenConversation } from '@/services/mediatorEngine/evaluation/runGoldenConversation';

describe('buildEvaluationBundle', () => {
  it('builds bundle for pilot conversation', async () => {
    const conversation = financesBlameConversation;
    const run = await runGoldenConversation(conversation);

    assert.equal(run.status, 'PASS');

    const bundle = buildEvaluationBundle(conversation, run);

    assert.equal(bundle.conversationId, conversation.id);
    assert.equal(bundle.conversationTitle, conversation.title);
    assert.equal(bundle.status, 'PASS');
    assert.equal(bundle.runResult, run);
    assert.ok(bundle.goalEvaluation);
    assert.ok(bundle.strategyEvaluation);
    assert.ok(bundle.safetyEvaluation);
    assert.equal(bundle.interventionEvaluation, undefined);
  });

  it('includes interventionEvaluation when expectedInterventions provided', async () => {
    const conversation = financesBlameConversation;
    const run = await runGoldenConversation(conversation);
    const expectedInterventions = ['validate', 'reflect', 'mirror'] as const;

    const bundle = buildEvaluationBundle(conversation, run, [...expectedInterventions]);

    assert.ok(bundle.interventionEvaluation);
    assert.deepEqual(bundle.interventionEvaluation.expectedInterventions, [...expectedInterventions]);
    assert.ok(Array.isArray(bundle.interventionEvaluation.actualInterventions));
  });

  it('builds bundle for SKIPPED conversation', async () => {
    const run = await runGoldenConversation(lackOfClosenessConversation);
    const bundle = buildEvaluationBundle(lackOfClosenessConversation, run);

    assert.equal(bundle.status, 'SKIPPED');
    assert.equal(bundle.conversationId, lackOfClosenessConversation.id);
    assert.ok(bundle.goalEvaluation);
    assert.ok(bundle.strategyEvaluation);
    assert.ok(bundle.safetyEvaluation);
    assert.equal(bundle.interventionEvaluation, undefined);
  });
});
