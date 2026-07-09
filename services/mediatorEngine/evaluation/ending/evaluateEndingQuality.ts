import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';
import type {
  EndingBenchmarkStatus,
  EndingConceptCheck,
  EndingConversationRunResult,
  EndingForbiddenCheck,
  EndingQualityEvaluation,
} from '@/services/mediatorEngine/evaluation/ending/types';
import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';

const KNOWN_STUB_PHRASE =
  'Słyszę, że to jest trudne dla was obojga. Zatrzymajmy się na chwilę i mówcie po kolei.';

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; note: string }> = [
  { pattern: /\b(jesteś|jesteście|twoja|twój)\s+win/i, note: 'Wskazywanie winy' },
  { pattern: /\bwinna?\s+jest\b/i, note: 'Wskazywanie winy' },
  { pattern: /pełne\s+porozumienie/i, note: 'Fałszywe domknięcie — pełne porozumienie' },
  { pattern: /problem\s+(jest\s+)?rozwiązan/i, note: 'Fałszywe domknięcie — problem rozwiązany' },
  { pattern: /wszystko\s+(jest\s+)?załatw/i, note: 'Fałszywe domknięcie' },
  { pattern: /konflikt\s+(został\s+)?rozwiązan/i, note: 'Fałszywe domknięcie' },
  { pattern: /jedynym\s+rozwiązaniem.*terap/i, note: 'Terapia jako jedyne rozwiązanie' },
  { pattern: /musicie\s+pójść\s+do\s+terap/i, note: 'Terapia jako jedyne rozwiązanie' },
];

const CLOSING_QUESTION_PATTERNS = [
  /\bczy\s+.+\?/i,
  /czy\s+taki/i,
  /czy\s+to\s+jest\s+dla\s+(was|obojga)/i,
  /czy\s+możecie/i,
  /czy\s+czujecie/i,
];

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function detectStubRuntime(
  run: ConversationRunResult,
  evaluatedText: string | null
): boolean {
  if (evaluatedText && evaluatedText !== KNOWN_STUB_PHRASE) {
    const endingRun = run as EndingConversationRunResult;
    if (endingRun.endingEvaluationText?.trim() === evaluatedText) {
      return false;
    }
  }

  const texts = run.turns
    .map((turn) => turn.finalMediatorMessage?.text?.trim() ?? '')
    .filter((text) => text.length > 0);

  if (texts.length === 0) {
    return true;
  }

  const allIdentical = texts.every((text) => text === texts[0]);

  return allIdentical && texts[0] === KNOWN_STUB_PHRASE;
}

function evaluateConcepts(
  text: string,
  conversation: EndingConversation
): EndingConceptCheck[] {
  const normalized = normalizeText(text);

  return conversation.expectedEndingConcepts.map((concept) => ({
    conceptId: concept.id,
    label: concept.label,
    matched: concept.patterns.some((pattern) => pattern.test(normalized)),
  }));
}

function evaluateForbidden(text: string): EndingForbiddenCheck[] {
  const normalized = normalizeText(text);

  return FORBIDDEN_PATTERNS.map(({ pattern, note }) => ({
    pattern: pattern.source,
    matched: pattern.test(normalized),
    note,
  }));
}

function detectClosingQuestion(text: string): boolean {
  const normalized = normalizeText(text);
  return CLOSING_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function detectFalseClosure(text: string): boolean {
  const normalized = normalizeText(text);
  return FORBIDDEN_PATTERNS.some(
    (entry) =>
      entry.note.includes('Fałszywe domknięcie') && entry.pattern.test(normalized)
  );
}

function resolveStatus(params: {
  pipelineFailed: boolean;
  stubDetected: boolean;
  forbiddenViolations: number;
  conceptsMatched: number;
  conceptsTotal: number;
  closingQuestionDetected: boolean;
}): EndingBenchmarkStatus {
  if (params.pipelineFailed) {
    return 'PIPELINE_FAILED';
  }

  if (params.stubDetected) {
    return 'DIAGNOSTIC_LIMITED';
  }

  const conceptCoverage = params.conceptsTotal === 0 ? 1 : params.conceptsMatched / params.conceptsTotal;
  const hasCriticalGaps =
    params.forbiddenViolations > 0 ||
    conceptCoverage < 0.6 ||
    !params.closingQuestionDetected;

  return hasCriticalGaps ? 'FAIL' : 'PASS';
}

export function evaluateEndingQuality(
  run: ConversationRunResult,
  conversation: EndingConversation
): EndingQualityEvaluation {
  const pipelineFailed = run.status === 'FAILED';
  const lastTurn = run.turns.at(-1);
  const lastMediatorResponse = lastTurn?.finalMediatorMessage?.text?.trim() ?? null;
  const endingRun = run as EndingConversationRunResult;
  const evaluatedText =
    endingRun.endingEvaluationText?.trim() ?? lastMediatorResponse ?? '';
  const evaluationText = evaluatedText;

  const stubDetected = !pipelineFailed && detectStubRuntime(run, evaluatedText || null);
  const conceptChecks = evaluateConcepts(evaluationText, conversation);
  const forbiddenChecks = evaluateForbidden(evaluationText);
  const conceptsMatched = conceptChecks.filter((check) => check.matched).length;
  const conceptsTotal = conceptChecks.length;
  const forbiddenViolations = forbiddenChecks.filter((check) => check.matched).length;
  const closingQuestionDetected = detectClosingQuestion(evaluationText);
  const falseClosureDetected = detectFalseClosure(evaluationText);

  const missingForMeasurement: string[] = [];

  if (stubDetected) {
    missingForMeasurement.push(
      'Deterministyczny stub LLM zwraca identyczny tekst — brak kontekstowej odpowiedzi ending.'
    );
    missingForMeasurement.push(
      'Potrzebny kontekstowy provider LLM lub bogatszy ending-stub reagujący na transcript.'
    );
    missingForMeasurement.push(
      'Heurystyki pojęć/forbidden działają tylko na ostatniej odpowiedzi mediatora.'
    );
  }

  const canMeasureEndingQuality = !stubDetected && !pipelineFailed;
  const status = resolveStatus({
    pipelineFailed,
    stubDetected,
    forbiddenViolations,
    conceptsMatched,
    conceptsTotal,
    closingQuestionDetected,
  });

  const runtimeNote = stubDetected
    ? 'Runtime używa deterministycznego stubu — ending quality nie jest wiarygodnie mierzalna.'
    : canMeasureEndingQuality
      ? 'Runtime pozwala na heurystyczną ocenę ending (ograniczona — bez LLM-judge).'
      : 'Pipeline nie zakończył się poprawnie.';

  return {
    status,
    canMeasureEndingQuality,
    runtimeNote,
    stubDetected,
    conceptChecks,
    forbiddenChecks,
    conceptsMatched,
    conceptsTotal,
    forbiddenViolations,
    closingQuestionDetected,
    falseClosureDetected,
    lastMediatorResponse,
    evaluatedText: evaluatedText || null,
    missingForMeasurement,
  };
}
