import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';
import { createEndingAwareStubProvider } from '@/services/mediatorEngine/evaluation/ending/createEndingAwareStubProvider';
import { evaluateEndingQuality } from '@/services/mediatorEngine/evaluation/ending/evaluateEndingQuality';
import { runEndingConversation } from '@/services/mediatorEngine/evaluation/ending/runEndingConversation';
import type {
  EndingBenchmarkResult,
  EndingEvaluationBundle,
} from '@/services/mediatorEngine/evaluation/ending/types';
import type { LlmProviderPort } from '@/types/mediator';

export interface RunEndingEvaluationOptions {
  llmProvider?: LlmProviderPort;
}

export async function runEndingEvaluation(
  conversation: EndingConversation,
  options?: RunEndingEvaluationOptions
): Promise<EndingEvaluationBundle> {
  const llmProvider =
    options?.llmProvider ?? createEndingAwareStubProvider(conversation);
  const runResult = await runEndingConversation(conversation, { llmProvider });
  const endingQuality = evaluateEndingQuality(runResult, conversation);

  return {
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    sourceGoldenConversationId: conversation.sourceGoldenConversationId,
    pipelineStatus: runResult.status,
    executedTurns: runResult.executedTurns,
    runResult,
    endingQuality,
  };
}

function countByEndingStatus(
  results: EndingEvaluationBundle[]
): Pick<
  EndingBenchmarkResult,
  'passed' | 'failed' | 'diagnosticLimited' | 'pipelineFailed'
> {
  let passed = 0;
  let failed = 0;
  let diagnosticLimited = 0;
  let pipelineFailed = 0;

  for (const result of results) {
    switch (result.endingQuality.status) {
      case 'PASS':
        passed += 1;
        break;
      case 'FAIL':
        failed += 1;
        break;
      case 'DIAGNOSTIC_LIMITED':
        diagnosticLimited += 1;
        break;
      case 'PIPELINE_FAILED':
        pipelineFailed += 1;
        break;
      default:
        break;
    }
  }

  return { passed, failed, diagnosticLimited, pipelineFailed };
}

export async function runEndingBenchmark(
  conversations: EndingConversation[]
): Promise<EndingBenchmarkResult> {
  const results: EndingEvaluationBundle[] = [];

  for (const conversation of conversations) {
    results.push(await runEndingEvaluation(conversation));
  }

  const counts = countByEndingStatus(results);

  return {
    total: conversations.length,
    ...counts,
    results,
  };
}
