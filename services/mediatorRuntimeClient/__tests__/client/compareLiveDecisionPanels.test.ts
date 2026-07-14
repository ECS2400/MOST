import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  compareLiveDecisionPanels,
  resolveRuntimeLiveDecisionPanelKind,
} from '@/tests/runtimeComparison/compareLiveDecisionPanels';
import {
  resolveLegacyLiveDecisionPanelState,
  type LiveLegacyDecisionPanelInput,
} from '@/tests/runtimeComparison/resolveLegacyLiveDecisionPanel';

function legacyInput(
  overrides: Partial<LiveLegacyDecisionPanelInput> = {}
): LiveLegacyDecisionPanelInput {
  return {
    sessionFlowStage: undefined,
    showDecisionPanel: false,
    showProposalPanel: false,
    sessionUnresolvedClosed: false,
    sessionFinished: false,
    ...overrides,
  };
}

describe('resolveLegacyLiveDecisionPanelState', () => {
  it('maps awaiting_main_decision flow to continue_after_summary', () => {
    const state = resolveLegacyLiveDecisionPanelState(
      legacyInput({ sessionFlowStage: 'awaiting_main_decision', showDecisionPanel: true })
    );

    assert.equal(state.flowKind, 'continue_after_summary');
    assert.equal(state.visibleKind, 'continue_after_summary');
  });

  it('maps awaiting_extension_decision flow to continue_after_extension', () => {
    const state = resolveLegacyLiveDecisionPanelState(
      legacyInput({
        sessionFlowStage: 'awaiting_extension_decision',
        showDecisionPanel: true,
      })
    );

    assert.equal(state.flowKind, 'continue_after_extension');
    assert.equal(state.visibleKind, 'continue_after_extension');
  });

  it('maps awaiting_proposal_decision flow to proposal_accept_reject', () => {
    const state = resolveLegacyLiveDecisionPanelState(
      legacyInput({
        sessionFlowStage: 'awaiting_proposal_decision',
        showProposalPanel: true,
      })
    );

    assert.equal(state.flowKind, 'proposal_accept_reject');
    assert.equal(state.visibleKind, 'proposal_accept_reject');
  });

  it('keeps flow kind while panel is hidden after user decided', () => {
    const state = resolveLegacyLiveDecisionPanelState(
      legacyInput({
        sessionFlowStage: 'awaiting_proposal_decision',
        showProposalPanel: false,
      })
    );

    assert.equal(state.flowKind, 'proposal_accept_reject');
    assert.equal(state.visibleKind, null);
  });

  it('maps terminal unresolved state to dispute_resolved_confirm visible kind', () => {
    const state = resolveLegacyLiveDecisionPanelState(
      legacyInput({ sessionFlowStage: 'unresolved_but_closed', sessionUnresolvedClosed: true })
    );

    assert.equal(state.flowKind, null);
    assert.equal(state.visibleKind, 'dispute_resolved_confirm');
  });
});

describe('compareLiveDecisionPanels', () => {
  it('reports match when runtime and legacy flow kinds align', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        presentation: {
          ...createMinimalRuntimeSuccess().runtimeSession.presentation,
          showDecisionPanel: {
            kind: 'proposal_accept_reject',
            options: ['accept', 'reject'],
            copyKey: 'runtime.decision.proposal_accept_reject',
          },
        },
      },
    });

    const legacy = resolveLegacyLiveDecisionPanelState(
      legacyInput({
        sessionFlowStage: 'awaiting_proposal_decision',
        showProposalPanel: true,
      })
    );

    const comparison = compareLiveDecisionPanels(runtime.runtimeSession, legacy);

    assert.equal(comparison.runtimeKind, 'proposal_accept_reject');
    assert.equal(comparison.flowKindsMatch, true);
    assert.equal(comparison.visibleWouldMatch, true);
    assert.deepEqual(comparison.mismatchReasons, []);
  });

  it('reports flow mismatch when runtime kind differs', () => {
    const runtime = createMinimalRuntimeSuccess();
    const legacy = resolveLegacyLiveDecisionPanelState(
      legacyInput({
        sessionFlowStage: 'awaiting_main_decision',
        showDecisionPanel: true,
      })
    );

    const comparison = compareLiveDecisionPanels(runtime.runtimeSession, legacy);

    assert.equal(comparison.flowKindsMatch, false);
    assert.ok(comparison.mismatchReasons.includes('kind_flow_mismatch'));
    assert.ok(comparison.mismatchReasons.includes('runtime_panel_missing'));
  });

  it('reports runtime_unavailable when runtimeSession is null', () => {
    const legacy = resolveLegacyLiveDecisionPanelState(
      legacyInput({ sessionFlowStage: 'awaiting_main_decision' })
    );

    const comparison = compareLiveDecisionPanels(null, legacy);

    assert.equal(comparison.runtimeKind, null);
    assert.deepEqual(comparison.mismatchReasons, ['runtime_unavailable']);
  });

  it('resolveRuntimeLiveDecisionPanelKind returns null without runtime session', () => {
    assert.equal(resolveRuntimeLiveDecisionPanelKind(null), null);
  });
});
