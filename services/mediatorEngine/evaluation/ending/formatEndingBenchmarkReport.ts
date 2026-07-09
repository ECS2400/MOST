import type { EndingBenchmarkResult } from '@/services/mediatorEngine/evaluation/ending/types';

export function formatEndingBenchmarkReport(result: EndingBenchmarkResult): string {
  const lines: string[] = [
    'MOST ENDING BENCHMARK (Phase 5J)',
    '========================================================',
    '',
    'SUMMARY',
    '',
    `Total              ${result.total}`,
    `Pass               ${result.passed}`,
    `Fail               ${result.failed}`,
    `Diagnostic limited ${result.diagnosticLimited}`,
    `Pipeline failed    ${result.pipelineFailed}`,
    '',
    '--------------------------------------------------------',
    '',
    'CONVERSATIONS',
    '',
    'Status              Measurable   Concepts   Forbidden   Pipeline   Conversation',
  ];

  for (const bundle of result.results) {
    const q = bundle.endingQuality;
    lines.push(
      [
        q.status.padEnd(19),
        String(q.canMeasureEndingQuality).padEnd(12),
        `${q.conceptsMatched}/${q.conceptsTotal}`.padEnd(10),
        String(q.forbiddenViolations).padEnd(11),
        bundle.pipelineStatus.padEnd(10),
        bundle.conversationId,
      ].join(' ')
    );
  }

  lines.push('', '========================================================', '');

  for (const bundle of result.results) {
    const q = bundle.endingQuality;
    lines.push(`--- ${bundle.conversationId} ---`);
    lines.push(`Runtime: ${q.runtimeNote}`);
    if (q.missingForMeasurement.length > 0) {
      lines.push('Missing for measurement:');
      for (const item of q.missingForMeasurement) {
        lines.push(`  - ${item}`);
      }
    }
    lines.push(`Last mediator response: ${q.evaluatedText ?? q.lastMediatorResponse ?? '(none)'}`);
    lines.push('Concept checks:');
    for (const check of q.conceptChecks) {
      lines.push(`  [${check.matched ? 'x' : ' '}] ${check.conceptId}: ${check.label}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
