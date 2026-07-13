import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldBlockSolutionGoalAdvance } from '@/services/mediatorEngine/goalContinuity/therapeuticExplorationReadiness';
import { createEmptyMediationState, createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';

describe('therapeuticExplorationReadiness', () => {
  it('blocks advance to FUTURE_PLAN until exploration signals are collected', () => {
    const state = createEmptyMediationState({
      mediationId: 'med-1',
      sessionId: 'med-1',
      turnNumber: 3,
      trigger: 'host_generate',
      transcriptDelta: [],
      language: 'pl',
      engineVersion: 'v2.3',
    });
    const memory = createEmptySessionMemory();

    assert.equal(shouldBlockSolutionGoalAdvance('FUTURE_PLAN', state, memory), true);
    assert.equal(shouldBlockSolutionGoalAdvance('AGREEMENT', state, memory), true);
    assert.equal(shouldBlockSolutionGoalAdvance('EMOTION_NAMING', state, memory), false);
  });
});
