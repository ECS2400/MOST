import type {
  BenchmarkConversationReport,
  BenchmarkReport,
} from '@/services/mediatorEngine/evaluation/benchmarkReport/types';

const SECTION_SEPARATOR = '========================================================';
const SUBSECTION_SEPARATOR = '--------------------------------------------------------';

function formatScore(value: number): string {
  return value.toFixed(2);
}

function formatOptionalScore(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return formatScore(value);
}

function formatConversationRow(conversation: BenchmarkConversationReport): string {
  return [
    (conversation.grade ?? '-').padEnd(8),
    formatOptionalScore(conversation.overallScore).padEnd(10),
    formatOptionalScore(conversation.goalScore).padEnd(7),
    formatOptionalScore(conversation.strategyScore).padEnd(11),
    formatOptionalScore(conversation.safetyScore).padEnd(9),
    conversation.status.padEnd(9),
    conversation.conversationId,
  ].join('');
}

function formatPerformerSection(conversations: BenchmarkConversationReport[]): string[] {
  if (conversations.length === 0) {
    return ['(none)'];
  }

  return conversations.map((conversation) => formatConversationRow(conversation));
}

export function formatBenchmarkReport(report: BenchmarkReport): string {
  const lines: string[] = [
    'MOST BENCHMARK',
    SECTION_SEPARATOR,
    '',
    'SUMMARY',
    '',
    `Total     ${report.total}`,
    `Passed    ${report.passed}`,
    `Failed    ${report.failed}`,
    `Skipped   ${report.skipped}`,
    '',
    SUBSECTION_SEPARATOR,
    '',
    'AVERAGES',
    '',
    `Goal          ${formatScore(report.averageGoalScore)}`,
    `Strategy      ${formatScore(report.averageStrategyScore)}`,
    `Intervention  ${formatScore(report.averageInterventionScore)}`,
    `Safety        ${formatScore(report.averageSafetyScore)}`,
    `Overall       ${formatScore(report.averageOverallScore)}`,
    '',
    SUBSECTION_SEPARATOR,
    '',
    'CONVERSATIONS',
    '',
    'Grade   Overall   Goal   Strategy   Safety   Status   Conversation',
    ...report.conversations.map((conversation) => formatConversationRow(conversation)),
    '',
    SECTION_SEPARATOR,
    '',
    'BOTTOM PERFORMERS',
    '',
    ...formatPerformerSection([...report.rankedConversations].reverse().slice(0, 5)),
    '',
    SECTION_SEPARATOR,
    '',
    'TOP PERFORMERS',
    '',
    ...formatPerformerSection(report.rankedConversations.slice(0, 5)),
    '',
    SECTION_SEPARATOR,
    '',
    'SKIPPED CONVERSATIONS',
    '',
    ...(report.skippedConversations.length === 0
      ? ['(none)']
      : report.skippedConversations.map(
          (conversation) => `${conversation.conversationId} ${conversation.skipReason ?? '(unknown)'}`
        )),
    '',
    SECTION_SEPARATOR,
    '',
    'FAILED CONVERSATIONS',
    '',
    ...(report.failedConversations.length === 0
      ? ['(none)']
      : report.failedConversations.map(
          (conversation) => `${conversation.conversationId} ${conversation.failureReason ?? '(unknown)'}`
        )),
    '',
    SECTION_SEPARATOR,
  ];

  return lines.join('\n');
}
