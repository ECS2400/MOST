/**
 * Runtime decision panel resolver — unit tests (Phase UI-B.3c.5a).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeRuntimeSession,
  type ComposeRuntimeSessionInput,
} from '@/services/mediatorEngine/runtimeSession/composeRuntimeSession';
import {
  countClosureSummaries,
  inferExtensionActive,
  resolveRuntimeDecisionPanel,
} from '@/services/mediatorEngine/runtimeSession/resolveRuntimeDecisionPanel';
import {
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createMinimalIntervention } from '@/services/mediatorEngine/intervention/builder/buildIntervention';
import type { OrchestrateTurnRequest } from '@/types/mediator';

const BASE_REQUEST: OrchestrateTurnRequest = {
  mediationId: 'med-1',
  sessionId: 'med-1',
  turnNumber: 1,
  trigger: 'session_start',
  transcriptDelta: [],
  language: 'en',
  engineVersion: 'v2.3',
};

function buildInput(
  overrides: Partial<ComposeRuntimeSessionInput> & {
    statePatch?: (state: ReturnType<typeof createEmptyMediationState>) => void;
  } = {}
): ComposeRuntimeSessionInput {
  const mediationState = createEmptyMediationState({
    ...BASE_REQUEST,
    turnNumber: overrides.runtimeMetadata?.turnNumber ?? 1,
  });
  overrides.statePatch?.(mediationState);

  const intervention = createMinimalIntervention(
    overrides.runtimeMetadata?.turnNumber ?? 1
  );
  if (overrides.intervention) {
    Object.assign(intervention, overrides.intervention);
  }

  return {
    mediationState,
    sessionMemory: createEmptySessionMemory(),
    intervention,
    finalMediatorMessage: {
      text: 'How are you feeling about what happened?',
      source: 'stub',
      safetyLevel: 'none',
      language: 'en',
      turnNumber: 1,
      accepted: true,
      validationAction: 'accept',
    },
    runtimeMetadata: {
      engineVersion: 'v2.3',
      turnNumber: 1,
      startedAt: '2026-07-10T10:00:00.000Z',
      completedAt: '2026-07-10T10:00:01.000Z',
      durationMs: 1000,
      providerId: 'deterministic-stub',
      retryCount: 0,
    },
    fallbackUsed: false,
    ...overrides,
  };
}

function closureSummaryHistory(turnNumber: number) {
  return {
    interventionHistory: [
      {
        interventionId: 'int-closure-1',
        turnNumber,
        type: 'summarize_close' as const,
        goal: 'CLOSURE' as const,
        intent: 'close_with_dignity' as const,
        strategy: 'build_safety' as const,
        expectedEffectId: 'eff-1',
        signature: 'sig-closure-1',
        compliance: {
          compliant: true,
          violationCount: 0,
          blockingViolationCount: 0,
          fallbackUsed: false,
          attemptNumber: 1,
        },
        effective: true,
        confidence: 80,
      },
    ],
  };
}

describe('resolveRuntimeDecisionPanel', () => {
  it('returns null for ordinary question turns', () => {
    const input = buildInput({
      intervention: {
        ...createMinimalIntervention(2),
        type: 'open_deepen',
        goal: 'EMOTION_NAMING',
      },
    });

    const panel = resolveRuntimeDecisionPanel({
      mediationState: input.mediationState,
      sessionMemory: input.sessionMemory,
      intervention: input.intervention,
      finalMediatorMessage: input.finalMediatorMessage,
      runtimeOutcome: 'ongoing',
      proposalPhase: 'none',
      turnOrdinal: 2,
    });

    assert.equal(panel, null);
  });

  it('returns proposal_accept_reject when proposal is presented with agreement content', () => {
    const input = buildInput({
      intervention: {
        ...createMinimalIntervention(10),
        type: 'propose_rule',
        goal: 'AGREEMENT',
      },
      statePatch: (state) => {
        state.currentGoal = 'AGREEMENT';
        state.agreements.sharedRule = 'We speak calmly during disagreements.';
      },
      finalMediatorMessage: {
        text: 'Would you both agree to this shared rule?',
        source: 'stub',
        safetyLevel: 'none',
        language: 'en',
        turnNumber: 10,
        accepted: true,
        validationAction: 'accept',
      },
    });

    const panel = resolveRuntimeDecisionPanel({
      mediationState: input.mediationState,
      sessionMemory: input.sessionMemory,
      intervention: input.intervention,
      finalMediatorMessage: input.finalMediatorMessage,
      runtimeOutcome: 'proposal_pending',
      proposalPhase: 'presented',
      turnOrdinal: 10,
    });

    assert.ok(panel);
    assert.equal(panel.kind, 'proposal_accept_reject');
    assert.deepEqual(panel.options, ['accept', 'reject']);
    assert.equal(panel.copyKey, 'runtime.decision.proposal_accept_reject');
  });

  it('returns continue_after_summary after first CLOSURE summarize_close', () => {
    const input = buildInput({
      intervention: {
        ...createMinimalIntervention(12),
        type: 'summarize_close',
        goal: 'CLOSURE',
      },
      statePatch: (state) => {
        state.currentGoal = 'CLOSURE';
      },
      finalMediatorMessage: {
        text: 'Here is where we stand together.',
        source: 'stub',
        safetyLevel: 'none',
        language: 'en',
        turnNumber: 12,
        accepted: true,
        validationAction: 'accept',
      },
    });

    const panel = resolveRuntimeDecisionPanel({
      mediationState: input.mediationState,
      sessionMemory: input.sessionMemory,
      intervention: input.intervention,
      finalMediatorMessage: input.finalMediatorMessage,
      runtimeOutcome: 'needs_extension_offer',
      proposalPhase: 'none',
      turnOrdinal: 12,
    });

    assert.ok(panel);
    assert.equal(panel.kind, 'continue_after_summary');
    assert.deepEqual(panel.options, ['continue', 'resolve']);
    assert.equal(panel.summaryAnchorTurn, 12);
  });

  it('returns continue_after_extension after second CLOSURE summarize_close', () => {
    const input = buildInput({
      sessionMemory: {
        ...createEmptySessionMemory(),
        ...closureSummaryHistory(11),
      },
      intervention: {
        ...createMinimalIntervention(16),
        type: 'summarize_close',
        goal: 'CLOSURE',
      },
      statePatch: (state) => {
        state.currentGoal = 'CLOSURE';
      },
      finalMediatorMessage: {
        text: 'After the extension, here is our updated summary.',
        source: 'stub',
        safetyLevel: 'none',
        language: 'en',
        turnNumber: 16,
        accepted: true,
        validationAction: 'accept',
      },
    });

    const panel = resolveRuntimeDecisionPanel({
      mediationState: input.mediationState,
      sessionMemory: input.sessionMemory,
      intervention: input.intervention,
      finalMediatorMessage: input.finalMediatorMessage,
      runtimeOutcome: 'needs_extension_offer',
      proposalPhase: 'none',
      turnOrdinal: 16,
    });

    assert.ok(panel);
    assert.equal(panel.kind, 'continue_after_extension');
    assert.deepEqual(panel.options, ['continue', 'resolve']);
  });

  it('countClosureSummaries includes the current intervention turn', () => {
    const intervention = {
      ...createMinimalIntervention(12),
      type: 'summarize_close' as const,
      goal: 'CLOSURE' as const,
    };

    assert.equal(countClosureSummaries(createEmptySessionMemory(), intervention), 1);
    assert.equal(
      countClosureSummaries(
        { ...createEmptySessionMemory(), ...closureSummaryHistory(11) },
        intervention
      ),
      2
    );
  });

  it('inferExtensionActive is true once a CLOSURE summary exists in memory', () => {
    const intervention = {
      ...createMinimalIntervention(13),
      type: 'open_deepen' as const,
      goal: 'CLOSURE' as const,
    };
    const state = createEmptyMediationState({ ...BASE_REQUEST, turnNumber: 13 });
    state.currentGoal = 'CLOSURE';

    assert.equal(
      inferExtensionActive(createEmptySessionMemory(), state, intervention),
      false
    );
    assert.equal(
      inferExtensionActive(
        { ...createEmptySessionMemory(), ...closureSummaryHistory(11) },
        state,
        intervention
      ),
      true
    );
  });
});

describe('composeRuntimeSession decision panel integration', () => {
  it('exposes showDecisionPanel and aligned pending for proposal turns', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(10),
          type: 'propose_rule',
          goal: 'AGREEMENT',
        },
        statePatch: (state) => {
          state.currentGoal = 'AGREEMENT';
          state.agreements.sharedRule = 'We pause before responding when upset.';
        },
        finalMediatorMessage: {
          text: 'Can you both accept this agreement?',
          source: 'stub',
          safetyLevel: 'none',
          language: 'en',
          turnNumber: 10,
          accepted: true,
          validationAction: 'accept',
        },
        runtimeMetadata: {
          engineVersion: 'v2.3',
          turnNumber: 10,
          startedAt: '2026-07-10T10:00:00.000Z',
          completedAt: '2026-07-10T10:00:01.000Z',
          durationMs: 1000,
          providerId: 'deterministic-stub',
          retryCount: 0,
        },
      })
    );

    assert.ok(result.presentation.showDecisionPanel);
    assert.equal(result.presentation.showDecisionPanel?.kind, 'proposal_accept_reject');
    assert.equal(result.presentation.hideInput, true);
    assert.equal(result.pending.awaiting, 'proposal_decision');
    assert.deepEqual(result.pending.satisfiedBy, ['proposal_accepted', 'proposal_rejected']);
    assert.equal(result.decision.blockedReason, 'awaiting_proposal_decision');
  });

  it('exposes continue_after_summary panel after first CLOSURE summary', () => {
    const result = composeRuntimeSession(
      buildInput({
        intervention: {
          ...createMinimalIntervention(12),
          type: 'summarize_close',
          goal: 'CLOSURE',
        },
        statePatch: (state) => {
          state.currentGoal = 'CLOSURE';
        },
        finalMediatorMessage: {
          text: 'Final summary for this mediation.',
          source: 'stub',
          safetyLevel: 'none',
          language: 'en',
          turnNumber: 12,
          accepted: true,
          validationAction: 'accept',
        },
        runtimeMetadata: {
          engineVersion: 'v2.3',
          turnNumber: 12,
          startedAt: '2026-07-10T10:00:00.000Z',
          completedAt: '2026-07-10T10:00:01.000Z',
          durationMs: 1000,
          providerId: 'deterministic-stub',
          retryCount: 0,
        },
      })
    );

    assert.ok(result.presentation.showDecisionPanel);
    assert.equal(result.presentation.showDecisionPanel?.kind, 'continue_after_summary');
    assert.equal(result.pending.awaiting, 'continue_decision');
    assert.equal(result.decision.blockedReason, 'awaiting_continue_decision');
    assert.equal(result.session.outcome, 'needs_extension_offer');
  });

  it('returns null decision panel for resolved sessions', () => {
    const result = composeRuntimeSession(
      buildInput({
        statePatch: (state) => {
          state.sessionOutcome = 'resolved';
          state.agreements.acceptedByBoth = true;
          state.currentGoal = 'CLOSURE';
        },
      })
    );

    assert.equal(result.presentation.showDecisionPanel, null);
  });
});
