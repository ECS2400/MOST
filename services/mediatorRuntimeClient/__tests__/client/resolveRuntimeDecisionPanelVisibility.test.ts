import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import { resolveRuntimeDecisionPanelVisibility } from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';

describe('resolveRuntimeDecisionPanelVisibility', () => {
  it('returns runtime_unavailable when runtimeSession is missing', () => {
    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: null,
      runtimeUnavailable: true,
    });

    assert.equal(visibility.source, 'runtime_unavailable');
    assert.equal(visibility.showMainDecisionPanel, false);
    assert.equal(visibility.showExtensionDecisionPanel, false);
  });

  it('shows proposal panel from runtime presentation', () => {
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

    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: runtime.runtimeSession,
    });

    assert.equal(visibility.source, 'runtime_available');
    assert.equal(visibility.kind, 'proposal_accept_reject');
    assert.equal(visibility.showProposalPanel, true);
    assert.equal(visibility.showMainDecisionPanel, false);
  });

  it('returns hidden when runtime has no decision panel', () => {
    const runtime = createMinimalRuntimeSuccess();

    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: runtime.runtimeSession,
    });

    assert.equal(visibility.source, 'hidden');
    assert.equal(visibility.showProposalPanel, false);
  });

  it('maps extension decision panel from runtime', () => {
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

    const visibility = resolveRuntimeDecisionPanelVisibility({
      runtimeSession: runtime.runtimeSession,
    });

    assert.equal(visibility.source, 'runtime_available');
    assert.equal(visibility.showExtensionDecisionPanel, true);
    assert.equal(visibility.showMainDecisionPanel, false);
  });
});
