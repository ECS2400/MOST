import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';

/** Rozszerzony wynik runnera ending (Phase 5J.2). */
export interface EndingConversationRunResult extends ConversationRunResult {
  /**
   * Tekst ending-aware stub do oceny, gdy pipeline wymusi fallback
   * (np. constitution l1.duplicate_intervention na długich rozmowach).
   */
  endingEvaluationText?: string;
}

/** Wynik ending benchmark — osobny od PASS/SKIPPED/FAILED replay 5I. */
export type EndingBenchmarkStatus =
  | 'PASS'
  | 'FAIL'
  | 'DIAGNOSTIC_LIMITED'
  | 'PIPELINE_FAILED';

export interface EndingConceptCheck {
  conceptId: string;
  label: string;
  matched: boolean;
}

export interface EndingForbiddenCheck {
  pattern: string;
  matched: boolean;
  note: string;
}

export interface EndingQualityEvaluation {
  status: EndingBenchmarkStatus;
  /** Czy obecny runtime pozwala sensownie mierzyć jakość ending (nie-stub LLM). */
  canMeasureEndingQuality: boolean;
  runtimeNote: string;
  stubDetected: boolean;
  conceptChecks: EndingConceptCheck[];
  forbiddenChecks: EndingForbiddenCheck[];
  conceptsMatched: number;
  conceptsTotal: number;
  forbiddenViolations: number;
  closingQuestionDetected: boolean;
  falseClosureDetected: boolean;
  lastMediatorResponse: string | null;
  /** Tekst faktycznie oceniany (może pochodzić z endingEvaluationText). */
  evaluatedText: string | null;
  missingForMeasurement: string[];
}

export interface EndingEvaluationBundle {
  conversationId: string;
  conversationTitle: string;
  sourceGoldenConversationId?: string;
  pipelineStatus: ConversationRunResult['status'];
  executedTurns: number;
  runResult: EndingConversationRunResult;
  endingQuality: EndingQualityEvaluation;
}

export interface EndingBenchmarkResult {
  total: number;
  passed: number;
  failed: number;
  diagnosticLimited: number;
  pipelineFailed: number;
  results: EndingEvaluationBundle[];
}
