import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  resolveLegacyLiveDecisionPanelState,
} from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';

function buildParams(overrides: {
  runtimeSession?: ReturnType<typeof createMinimalRuntimeSuccess>['runtimeSession'] | null;
  sessionFlowStage?: 'awaiting_main_decision' | 'awaiting_extension_decision' | 'awaiting_proposal_decision';
  showDecisionPanel?: boolean;
  showProposalPanel?: boolean;
  sessionUnresolvedClosed?: boolean;
} = {}) {
  const sessionFlowStage = overrides.sessionFlowStage;
  const showDecisionPanel = overrides.showDecisionPanel ?? false;
  const showProposalPanel = overrides.showProposalPanel ?? false;
  const sessionUnresolvedClosed = overrides.sessionUnresolvedClosed ?? false;

  const legacy = resolveLegacyLiveDecisionPanelState({
    sessionFlowStage,
    showDecisionPanel,
    showProposalPanel,
    sessionUnresolvedClosed,
    sessionFinished: false,
  });

  return {
    runtimeSession: overrides.runtimeSession ?? null,
    legacy,
    legacyVisibility: {
      showDecisionPanel,
      showProposalPanel,
      sessionUnresolvedClosed,
    },
    sessionFlowStage,
  };
}

describe('resolveRuntimeDecisionPanelVisibility', () => {
  it('uses legacy_fallback when runtimeSession is missing', () => {
    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        sessionFlowStage: 'awaiting_main_decision',
        showDecisionPanel: true,
      })
    );

    assert.equal(visibility.source, 'legacy_fallback');
    assert.equal(visibility.showMainDecisionPanel, true);
    assert.equal(visibility.showExtensionDecisionPanel, false);
  });

  it('uses runtime_confirmed when flow kinds match for proposal', () => {
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

    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        runtimeSession: runtime.runtimeSession,
        sessionFlowStage: 'awaiting_proposal_decision',
        showProposalPanel: true,
      })
    );

    assert.equal(visibility.source, 'runtime_confirmed');
    assert.equal(visibility.kind, 'proposal_accept_reject');
    assert.equal(visibility.showProposalPanel, true);
    assert.equal(visibility.showMainDecisionPanel, false);
  });

  it('falls back to legacy on kind_mismatch', () => {
    const runtime = createMinimalRuntimeSuccess();

    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        runtimeSession: runtime.runtimeSession,
        sessionFlowStage: 'awaiting_main_decision',
        showDecisionPanel: true,
      })
    );

    assert.equal(visibility.source, 'legacy_fallback');
    assert.equal(visibility.showMainDecisionPanel, true);
  });

  it('falls back to legacy on runtime_only panel', () => {
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

    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        runtimeSession: runtime.runtimeSession,
        sessionFlowStage: 'questions',
      })
    );

    assert.equal(visibility.source, 'legacy_fallback');
    assert.equal(visibility.showProposalPanel, false);
  });

  it('hides proposal panel under runtime_confirmed when user already decided', () => {
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

    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        runtimeSession: runtime.runtimeSession,
        sessionFlowStage: 'awaiting_proposal_decision',
        showProposalPanel: false,
      })
    );

    assert.equal(visibility.source, 'runtime_confirmed');
    assert.equal(visibility.showProposalPanel, false);
  });

  it('maps extension decision panel under runtime_confirmed', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        presentation: {
          ...createMinimalRuntimeSuccess().runtimeSession.presentation,
          showDecisionPanel: {
            kind: 'continue_after_extension',
            options: ['continue', 'resolve'],
            copyKey: 'runtime.decision.continue_after_extension',
          },
        },
      },
    });

    const visibility = resolveRuntimeDecisionPanelVisibility(
      buildParams({
        runtimeSession: runtime.runtimeSession,
        sessionFlowStage: 'awaiting_extension_decision',
        showDecisionPanel: true,
      })
    );

    assert.equal(visibility.source, 'runtime_confirmed');
    assert.equal(visibility.showExtensionDecisionPanel, true);
    assert.equal(visibility.showMainDecisionPanel, false);
  });
});
