/**
 * Golden Benchmark Runner — integration tests (Phase 4L).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/goldenBenchmark.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
import { householdChoresConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/household-chores';
import { lackOfCommunicationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-communication';
import { silenceAfterConflictConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/silence-after-conflict';
import { jealousyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/jealousy';
import { runGoldenBenchmark } from '@/services/mediatorEngine/evaluation/benchmark';

const BENCHMARK_CONVERSATIONS = [
  financesBlameConversation,
  householdChoresConversation,
  lackOfCommunicationConversation,
  silenceAfterConflictConversation,
  jealousyConversation,
] as const;

describe('runGoldenBenchmark', () => {
  it('runs pilot conversations and jealousy sequentially', async () => {
    const benchmark = await runGoldenBenchmark([...BENCHMARK_CONVERSATIONS]);

    assert.equal(benchmark.total, 5);
    assert.equal(benchmark.passed, 5);
    assert.equal(benchmark.skipped, 0);
    assert.equal(benchmark.failed, 0);
    assert.equal(benchmark.results.length, 5);

    const conversationIds = benchmark.results.map((result) => result.conversationId);
    assert.deepEqual(conversationIds, [
      'finances-blame',
      'household-chores',
      'lack-of-communication',
      'silence-after-conflict',
      'jealousy',
    ]);

    for (const result of benchmark.results) {
      assert.equal(result.conversationId, result.runResult.conversationId);
      assert.ok(result.goalEvaluation);
      assert.ok(result.strategyEvaluation);
      assert.ok(result.safetyEvaluation);
    }
  });
});
