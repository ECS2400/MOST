import { GOLDEN_CONVERSATIONS } from '@/services/mediatorEngine/__tests__/goldenConversations';
import { runGoldenBenchmark } from '@/services/mediatorEngine/evaluation/benchmark';
import { buildBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkReport';
import type { BenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkReport/types';
import { formatBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkCli';

export async function runBenchmark(): Promise<BenchmarkReport> {
  const benchmarkResult = await runGoldenBenchmark([...GOLDEN_CONVERSATIONS]);
  const report = buildBenchmarkReport(benchmarkResult);
  const formattedReport = formatBenchmarkReport(report);

  console.log(formattedReport);

  return report;
}
