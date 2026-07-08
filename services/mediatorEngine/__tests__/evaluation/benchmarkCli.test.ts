/**
 * Benchmark CLI Renderer — unit tests (Phase 5B).
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs --experimental-strip-types --test services/mediatorEngine/__tests__/evaluation/benchmarkCli.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkReport/types';
import { formatBenchmarkReport } from '@/services/mediatorEngine/evaluation/benchmarkCli';

function createReport(overrides: Partial<BenchmarkReport> = {}): BenchmarkReport {
  const conversations: BenchmarkReport['conversations'] = [
    {
      conversationId: 'finances-blame',
      conversationTitle: 'Finances Blame',
      status: 'PASS',
      goalScore: 0.93,
      strategyScore: 0.91,
      interventionScore: 1,
      safetyScore: 1,
      overallScore: 0.94,
      grade: 'A',
    },
    {
      conversationId: 'household-chores',
      conversationTitle: 'Household Chores',
      status: 'PASS',
      goalScore: 0.82,
      strategyScore: 0.59,
      interventionScore: 1,
      safetyScore: 1,
      overallScore: 0.86,
      grade: 'B',
    },
    {
      conversationId: 'jealousy',
      conversationTitle: 'Jealousy',
      status: 'SKIPPED',
      goalScore: null,
      strategyScore: null,
      interventionScore: null,
      safetyScore: null,
      overallScore: null,
      grade: null,
      skipReason: 'messages_missing',
    },
    {
      conversationId: 'failed-one',
      conversationTitle: 'Failed One',
      status: 'FAILED',
      goalScore: null,
      strategyScore: null,
      interventionScore: null,
      safetyScore: null,
      overallScore: null,
      grade: null,
      failureReason: 'runtime_error',
    },
  ];

  return {
    total: 4,
    passed: 2,
    failed: 1,
    skipped: 1,
    averageGoalScore: 0.875,
    averageStrategyScore: 0.75,
    averageInterventionScore: 1,
    averageSafetyScore: 1,
    averageOverallScore: 0.90625,
    conversations,
    rankedConversations: conversations.filter((conversation) => conversation.status === 'PASS'),
    skippedConversations: conversations.filter((conversation) => conversation.status === 'SKIPPED'),
    failedConversations: conversations.filter((conversation) => conversation.status === 'FAILED'),
    ...overrides,
  };
}

function section(output: string, sectionName: string): string {
  const start = output.indexOf(sectionName);

  if (start === -1) {
    return '';
  }

  const end = output.indexOf('========================================================', start);
  return output.slice(start, end === -1 ? output.length : end);
}

describe('formatBenchmarkReport', () => {
  it('contains SUMMARY', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /SUMMARY/);
    assert.match(output, /Total\s+4/);
    assert.match(output, /Passed\s+2/);
    assert.match(output, /Failed\s+1/);
    assert.match(output, /Skipped\s+1/);
  });

  it('contains AVERAGES', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /AVERAGES/);
    assert.match(output, /Goal\s+0\.88/);
    assert.match(output, /Strategy\s+0\.75/);
    assert.match(output, /Intervention\s+1\.00/);
    assert.match(output, /Safety\s+1\.00/);
    assert.match(output, /Overall\s+0\.91/);
  });

  it('contains CONVERSATIONS', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /CONVERSATIONS/);
    assert.match(output, /Grade\s+Overall\s+Goal\s+Strategy\s+Safety\s+Status\s+Conversation/);
    assert.match(output, /finances-blame/);
    assert.match(output, /household-chores/);
  });

  it('shows "-" for skipped in table', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /-\s+-\s+-\s+-\s+-\s+SKIPPED\s+jealousy/);
  });

  it('contains TOP PERFORMERS', () => {
    const output = formatBenchmarkReport(createReport());
    const top = section(output, 'TOP PERFORMERS');

    assert.match(output, /TOP PERFORMERS/);
    assert.match(top, /A\s+0\.94/);
    assert.doesNotMatch(top, /jealousy/);
  });

  it('contains BOTTOM PERFORMERS', () => {
    const output = formatBenchmarkReport(createReport());
    const bottom = section(output, 'BOTTOM PERFORMERS');

    assert.match(output, /BOTTOM PERFORMERS/);
    assert.match(bottom, /B\s+0\.86/);
    assert.doesNotMatch(bottom, /jealousy/);
  });

  it('contains SKIPPED CONVERSATIONS', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /SKIPPED CONVERSATIONS/);
    assert.match(output, /jealousy messages_missing/);
  });

  it('contains FAILED CONVERSATIONS', () => {
    const output = formatBenchmarkReport(createReport());

    assert.match(output, /FAILED CONVERSATIONS/);
    assert.match(output, /failed-one runtime_error/);
  });

  it('does not throw for empty conversation list', () => {
    const output = formatBenchmarkReport(
      createReport({
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        averageGoalScore: 0,
        averageStrategyScore: 0,
        averageInterventionScore: 0,
        averageSafetyScore: 0,
        averageOverallScore: 0,
        conversations: [],
        rankedConversations: [],
        skippedConversations: [],
        failedConversations: [],
      })
    );

    assert.match(output, /SUMMARY/);
    assert.match(output, /TOP PERFORMERS/);
    assert.match(output, /BOTTOM PERFORMERS/);
    assert.match(output, /\(none\)/);
  });
});
