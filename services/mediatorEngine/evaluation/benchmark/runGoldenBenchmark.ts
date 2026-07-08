import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type {
  BenchmarkResult,
  RunGoldenBenchmarkInput,
} from '@/services/mediatorEngine/evaluation/benchmark/types';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import { runConversationEvaluation } from '@/services/mediatorEngine/evaluation/runner';

function countByStatus(results: EvaluationBundle[]): Pick<BenchmarkResult, 'passed' | 'failed' | 'skipped'> {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    switch (result.status) {
      case 'PASS':
        passed += 1;
        break;
      case 'FAILED':
        failed += 1;
        break;
      case 'SKIPPED':
        skipped += 1;
        break;
      default:
        break;
    }
  }

  return { passed, failed, skipped };
}

export async function runGoldenBenchmark(
  conversations: GoldenConversation[]
): Promise<BenchmarkResult>;
export async function runGoldenBenchmark(
  input: RunGoldenBenchmarkInput
): Promise<BenchmarkResult>;
export async function runGoldenBenchmark(
  conversationsOrInput: GoldenConversation[] | RunGoldenBenchmarkInput
): Promise<BenchmarkResult> {
  const conversations =
    'conversations' in conversationsOrInput
      ? conversationsOrInput.conversations
      : conversationsOrInput;

  const results: EvaluationBundle[] = [];

  for (const conversation of conversations) {
    const bundle = await runConversationEvaluation(conversation);
    results.push(bundle);
  }

  const counts = countByStatus(results);

  return {
    total: conversations.length,
    ...counts,
    results,
  };
}
