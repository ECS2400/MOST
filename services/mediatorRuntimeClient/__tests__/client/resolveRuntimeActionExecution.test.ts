import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  canExecuteRuntimeClientAction,
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
  shouldUseLegacyClosureFallback,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import {
  resolveRuntimeAwaitingProposal,
  resolveRuntimeProposalPanelState,
  resolveRuntimeProposalUserDecided,
} from '@/services/mediatorRuntimeClient/resolveRuntimeProposalPanelState';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function runtimeWithProposal(
  overrides: Partial<RuntimeSession['proposal']> = {},
  sessionOverrides: Partial<RuntimeSession['session']> = {}
): RuntimeSession {
  const base = createMinimalRuntimeSuccess().runtimeSession;
  return {
    ...base,
    session: {
      ...base.session,
      ...sessionOverrides,
    },
    proposal: {
      ...base.proposal,
      phase: 'presented',
      content: {
        proposalId: 'prop-1',
        body: 'Shared rule',
        hostCommitment: 'Listen',
        partnerCommitment: 'Listen',
        sharedRule: 'Take turns',
      },
      ...overrides,
    },
    pending: {
      awaiting: 'proposal_decision',
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: ['proposal_accepted', 'proposal_rejected'],
    },
    presentation: {
      ...base.presentation,
      showDecisionPanel: {
        kind: 'proposal_accept_reject',
        summaryAnchorTurn: 12,
        options: ['accept', 'reject'],
        copyKey: 'runtime.decision.proposal_accept_reject',
      },
    },
  };
}

describe('resolveRuntimeActionExecution', () => {
  it('uses runtime when runtimeSession is available', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(execution.useRuntime, true);
    assert.equal(execution.useLegacyFallback, false);
    assert.equal(execution.reason, 'runtime_available');
  });

  it('falls back when runtimeSession is unavailable', () => {
    const execution = resolveRuntimeActionExecution({ runtimeSession: null });

    assert.equal(execution.useRuntime, false);
    assert.equal(execution.useLegacyFallback, true);
    assert.equal(execution.reason, 'runtime_unavailable');
  });

  it('falls back when runtime request failed', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      runtimeFailed: true,
    });

    assert.equal(execution.useRuntime, false);
    assert.equal(execution.reason, 'runtime_failed');
  });

  it('falls back on invalid runtime state flag', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      invalidRuntimeState: true,
    });

    assert.equal(execution.reason, 'invalid_runtime_state');
    assert.equal(execution.useLegacyFallback, true);
  });
});

describe('planLiveRuntimeClientAction', () => {
  it('runtime available → only runtime action for proposal accept', () => {
    const plan = planLiveRuntimeClientAction('proposal_accepted', {
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(plan.emitClientEvent, true);
    assert.equal(plan.callRuntimeTurn, true);
    assert.equal(plan.legacySteps.signalProposalDecision, false);
    assert.equal(plan.legacySteps.insertProposalClosureSummary, false);
    assert.equal(plan.legacySteps.immediateGoToClosure, false);
  });

  it('runtime unavailable → legacy fallback for proposal accept', () => {
    const plan = planLiveRuntimeClientAction('proposal_accepted', {
      runtimeSession: null,
    });

    assert.equal(plan.emitClientEvent, false);
    assert.equal(plan.callRuntimeTurn, false);
    assert.equal(plan.legacySteps.signalProposalDecision, true);
  });

  it('runtime available → proposal reject skips legacy closure summary', () => {
    const plan = planLiveRuntimeClientAction('proposal_rejected', {
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(plan.legacySteps.insertProposalClosureSummary, false);
    assert.equal(plan.legacySteps.immediateGoToClosure, false);
  });

  it('runtime unavailable → proposal reject keeps legacy closure side effects', () => {
    const plan = planLiveRuntimeClientAction('proposal_rejected', {
      runtimeSession: null,
    });

    assert.equal(plan.legacySteps.signalProposalDecision, true);
    assert.equal(plan.legacySteps.insertProposalClosureSummary, true);
    assert.equal(plan.legacySteps.immediateGoToClosure, true);
  });

  it('runtime available → resolve skips immediate legacy closure', () => {
    const plan = planLiveRuntimeClientAction('resolve_session', {
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(plan.emitClientEvent, true);
    assert.equal(plan.legacySteps.immediateGoToClosure, false);
    assert.equal(plan.legacySteps.signalSessionDecision, false);
  });

  it('runtime unavailable → resolve uses legacy session decision and closure', () => {
    const plan = planLiveRuntimeClientAction('resolve_session', {
      runtimeSession: null,
    });

    assert.equal(plan.legacySteps.signalSessionDecision, true);
    assert.equal(plan.legacySteps.immediateGoToClosure, true);
  });
});

describe('shouldUseLegacyClosureFallback', () => {
  it('uses legacy closure when runtime is unavailable', () => {
    assert.equal(
      shouldUseLegacyClosureFallback({ runtimeSession: null }),
      true
    );
  });

  it('skips legacy auto-closure when runtime terminal closure is ready', () => {
    const runtimeSession = {
      ...createMinimalRuntimeSuccess().runtimeSession,
      session: {
        ...createMinimalRuntimeSuccess().runtimeSession.session,
        outcome: 'resolved' as const,
      },
      closure: {
        directive: 'close_on_accept' as const,
        suggestedDbStatus: 'resolved' as const,
        closureMessage: 'Done',
        navigateToClosure: true,
      },
    };

    assert.equal(
      shouldUseLegacyClosureFallback({ runtimeSession }),
      false
    );
  });
});

describe('canExecuteRuntimeClientAction', () => {
  it('blocks duplicate click while processing', () => {
    assert.equal(canExecuteRuntimeClientAction(false, true), false);
  });

  it('blocks duplicate invocation after first execution', () => {
    assert.equal(canExecuteRuntimeClientAction(true, false), false);
  });

  it('allows first execution', () => {
    assert.equal(canExecuteRuntimeClientAction(false, false), true);
  });
});

describe('resolveRuntimeProposalPanelState', () => {
  it('returns null without runtimeSession', () => {
    assert.equal(resolveRuntimeProposalPanelState(null, true), null);
  });

  it('runtime votes control userDecided for host', () => {
    const runtimeSession = runtimeWithProposal({
      votes: { host: 'accepted', partner: null },
    });

    const state = resolveRuntimeProposalPanelState(runtimeSession, true);
    assert.equal(state?.source, 'runtime');
    assert.equal(state?.userDecided, true);
    assert.equal(state?.hostVote, 'accepted');
    assert.equal(state?.partnerVote, null);
  });

  it('runtime votes leave partner undecided until vote cast', () => {
    const runtimeSession = runtimeWithProposal({
      votes: { host: 'accepted', partner: null },
    });

    const state = resolveRuntimeProposalPanelState(runtimeSession, false);
    assert.equal(state?.userDecided, false);
  });

  it('detects awaiting proposal from runtime phase and pending', () => {
    const runtimeSession = runtimeWithProposal();
    assert.equal(resolveRuntimeAwaitingProposal(runtimeSession), true);
    assert.equal(resolveRuntimeProposalUserDecided(runtimeSession, true), false);
  });
});
