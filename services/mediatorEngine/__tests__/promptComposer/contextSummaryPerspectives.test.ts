import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildContextSummary } from '@/services/mediatorEngine/promptComposer/sections/buildContextSummary';

describe('buildContextSummary', () => {
  it('includes host intake and partner intake separately', () => {
    const summary = buildContextSummary({
      turnNumber: 2,
      currentGoal: 'STORY_COLLECTION',
      priorityOutput: { conversationMode: 'NORMAL' },
      strategyOutput: { primaryStrategy: 'slow_conflict' },
      decisionOutput: { goalTransition: 'stay' },
      continuityContext: null,
      goalContinuityContext: null,
      mediationState: {
        conflict: {
          conflictSummary: 'We argue about chores and feeling unheard.',
          preAnalysisContext: {
            hostEmotions: ['frustrated'],
            hostNeeds: ['support'],
            partnerEmotions: ['overwhelmed'],
            partnerNeeds: ['space'],
            keyTrigger: 'dirty dishes after work',
            hostPerspective: 'Host feels they carry most chores and wants more initiative.',
            partnerPerspective: 'Partner feels criticized and wants gentler requests.',
          },
        },
      },
    } as unknown as Parameters<typeof buildContextSummary>[0]);

    assert.ok(summary.includes('Host perspective:'), 'should include host perspective');
    assert.ok(summary.includes('Partner perspective:'), 'should include partner perspective');
    assert.ok(summary.includes('Shared conflict summary:'), 'should include shared summary');
  });
});

