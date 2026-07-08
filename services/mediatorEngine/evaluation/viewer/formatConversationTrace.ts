import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { GoalProgressionEvaluation } from '@/services/mediatorEngine/evaluation/goalProgression/types';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';
import type { FormatConversationTraceInput } from '@/services/mediatorEngine/evaluation/viewer/types';

function formatGoalPath(goals: TherapeuticGoal[]): string {
  if (goals.length === 0) {
    return '(none)';
  }

  return goals.join(' → ');
}

function formatGoalList(label: string, goals: TherapeuticGoal[]): string[] {
  if (goals.length === 0) {
    return [];
  }

  return [label, ...goals.map((goal) => goal)];
}

function formatComplianceStatus(compliant: boolean): string {
  return compliant ? 'PASS' : 'FAIL';
}

function formatMediatorText(trace: TurnTrace): string {
  const text = trace.finalMediatorMessage?.text?.trim();
  if (text) {
    return `"${text}"`;
  }

  return '(no mediator text)';
}

function formatGoalProgressionSection(goalEvaluation: GoalProgressionEvaluation): string[] {
  const lines = [
    '## Goal Progression',
    '',
    'Expected:',
    formatGoalPath(goalEvaluation.expectedGoalPath),
    '',
    'Actual:',
    formatGoalPath(goalEvaluation.actualGoalPath),
    '',
    `Matched prefix: ${goalEvaluation.matchedPrefixLength}`,
    `Exact match: ${goalEvaluation.exactMatch}`,
    '',
    ...formatGoalList('Missing:', goalEvaluation.missingGoals),
    ...(goalEvaluation.missingGoals.length > 0 ? [''] : []),
    ...formatGoalList('Unexpected:', goalEvaluation.unexpectedGoals),
    ...(goalEvaluation.unexpectedGoals.length > 0 ? [''] : []),
  ];

  return lines.filter((line, index, array) => !(line === '' && index === array.length - 1));
}

function formatTurnSection(trace: TurnTrace): string[] {
  const transition = trace.goalTransition ?? 'none';

  return [
    `## Turn ${trace.turnNumber}`,
    '',
    'Speaker:',
    trace.speaker,
    '',
    'Input:',
    `"${trace.inputMessage}"`,
    '',
    'Goal:',
    trace.currentGoal,
    '',
    'Strategy:',
    trace.strategy,
    '',
    'Intervention:',
    trace.interventionType,
    '',
    'Transition:',
    String(transition),
    '',
    'Safety:',
    trace.safetyLevel,
    '',
    'Compliance:',
    formatComplianceStatus(trace.compliance.compliant),
    '',
    'Mediator:',
    formatMediatorText(trace),
    '',
  ];
}

export function formatConversationTrace(
  conversation: GoldenConversation,
  run: ConversationRunResult,
  goalEvaluation?: GoalProgressionEvaluation
): string;
export function formatConversationTrace(input: FormatConversationTraceInput): string;
export function formatConversationTrace(
  conversationOrInput: GoldenConversation | FormatConversationTraceInput,
  run?: ConversationRunResult,
  goalEvaluation?: GoalProgressionEvaluation
): string {
  const conversation =
    'conversation' in conversationOrInput
      ? conversationOrInput.conversation
      : conversationOrInput;
  const resolvedRun =
    'conversation' in conversationOrInput ? conversationOrInput.run : run!;
  const resolvedGoalEvaluation =
    'conversation' in conversationOrInput
      ? conversationOrInput.goalEvaluation
      : goalEvaluation;

  const lines: string[] = [
    `# Golden Conversation: ${conversation.id}`,
    '',
    conversation.title,
    '',
    `Status: ${resolvedRun.status}`,
    `Turns: ${resolvedRun.executedTurns}`,
    '',
  ];

  if (resolvedRun.status === 'SKIPPED') {
    lines.push('Reason:', resolvedRun.skipReason ?? 'unknown', '');
    return lines.join('\n').trimEnd();
  }

  if (resolvedRun.status === 'FAILED') {
    lines.push('Failure:', resolvedRun.failureReason ?? 'unknown', '');
  }

  if (resolvedGoalEvaluation) {
    lines.push(...formatGoalProgressionSection(resolvedGoalEvaluation), '');
  }

  for (const trace of resolvedRun.turns) {
    lines.push(...formatTurnSection(trace));
  }

  return lines.join('\n').trimEnd();
}
