import type { EvaluationBundle } from '@/services/mediatorEngine/evaluation/bundle/types';
import type { InterventionEvaluation } from '@/services/mediatorEngine/evaluation/intervention/types';
import type { StrategyEvaluation } from '@/services/mediatorEngine/evaluation/strategy/types';
import type { FormatEvaluationReportInput } from '@/services/mediatorEngine/evaluation/report/types';

function formatSequence<T extends string>(items: readonly T[]): string {
  if (items.length === 0) {
    return '(none)';
  }

  return items.join(' → ');
}

function formatListSection(label: string, items: readonly string[]): string[] {
  const lines = [label];

  if (items.length === 0) {
    lines.push('- (none)');
  } else {
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }

  return lines;
}

function formatGoalProgressionSection(bundle: EvaluationBundle): string[] {
  const { goalEvaluation } = bundle;

  return [
    '## Goal Progression',
    '',
    'Expected',
    formatSequence(goalEvaluation.expectedGoalPath),
    '',
    'Actual',
    formatSequence(goalEvaluation.actualGoalPath),
    '',
    'Matched Prefix',
    String(goalEvaluation.matchedPrefixLength),
    '',
    'Missing Goals',
    ...formatListSection('', goalEvaluation.missingGoals).slice(1),
    '',
    'Unexpected Goals',
    ...formatListSection('', goalEvaluation.unexpectedGoals).slice(1),
    '',
    'Exact Match',
    String(goalEvaluation.exactMatch),
  ];
}

function formatStrategySection(strategyEvaluation: StrategyEvaluation): string[] {
  return [
    '## Strategy Evaluation',
    '',
    'Expected',
    formatSequence(strategyEvaluation.expectedStrategies),
    '',
    'Actual',
    formatSequence(strategyEvaluation.actualStrategies),
    '',
    'Coverage',
    String(strategyEvaluation.coverage),
    '',
    'Matched',
    ...formatListSection('', strategyEvaluation.matchedStrategies).slice(1),
    '',
    'Missing',
    ...formatListSection('', strategyEvaluation.missingStrategies).slice(1),
    '',
    'Unexpected',
    ...formatListSection('', strategyEvaluation.unexpectedStrategies).slice(1),
  ];
}

function formatInterventionSection(
  interventionEvaluation: InterventionEvaluation | undefined
): string[] {
  if (!interventionEvaluation) {
    return ['## Intervention Evaluation', '', 'Intervention evaluation not available.'];
  }

  return [
    '## Intervention Evaluation',
    '',
    'Expected',
    formatSequence(interventionEvaluation.expectedInterventions),
    '',
    'Actual',
    formatSequence(interventionEvaluation.actualInterventions),
    '',
    'Coverage',
    String(interventionEvaluation.coverage),
    '',
    'Matched',
    ...formatListSection('', interventionEvaluation.matchedInterventions).slice(1),
    '',
    'Missing',
    ...formatListSection('', interventionEvaluation.missingInterventions).slice(1),
    '',
    'Unexpected',
    ...formatListSection('', interventionEvaluation.unexpectedInterventions).slice(1),
  ];
}

function formatSafetySection(bundle: EvaluationBundle): string[] {
  const { safetyEvaluation } = bundle;

  return [
    '## Safety',
    '',
    'Expected',
    safetyEvaluation.expectedSafety,
    '',
    'Observed',
    safetyEvaluation.observedSafety,
    '',
    'Exact Match',
    String(safetyEvaluation.exactMatch),
    '',
    'Safer Than Expected',
    String(safetyEvaluation.isSaferThanExpected),
    '',
    'Less Safe Than Expected',
    String(safetyEvaluation.isLessSafeThanExpected),
  ];
}

function formatRunSummarySection(bundle: EvaluationBundle): string[] {
  return [
    '## Run Summary',
    '',
    'Executed Turns',
    String(bundle.runResult.executedTurns),
    '',
    'Run Status',
    bundle.status,
  ];
}

export function formatEvaluationReport(bundle: EvaluationBundle): string;
export function formatEvaluationReport(input: FormatEvaluationReportInput): string;
export function formatEvaluationReport(
  bundleOrInput: EvaluationBundle | FormatEvaluationReportInput
): string {
  const bundle = 'bundle' in bundleOrInput ? bundleOrInput.bundle : bundleOrInput;

  const lines = [
    '# Golden Conversation',
    '',
    bundle.conversationTitle,
    '',
    bundle.conversationId,
    '',
    bundle.status,
    '',
    ...formatGoalProgressionSection(bundle),
    '',
    ...formatStrategySection(bundle.strategyEvaluation),
    '',
    ...formatInterventionSection(bundle.interventionEvaluation),
    '',
    ...formatSafetySection(bundle),
    '',
    ...formatRunSummarySection(bundle),
  ];

  return lines.join('\n').trimEnd();
}
