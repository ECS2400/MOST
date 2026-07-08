import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';

export interface BenchmarkResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: EvaluationBundle[];
}

export interface RunGoldenBenchmarkInput {
  conversations: GoldenConversation[];
}
