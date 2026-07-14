import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  canExecuteRuntimeClientAction,
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
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
    assert.equal(execution.runtimeUnavailable, false);
    assert.equal(execution.reason, 'runtime_available');
  });

  it('marks runtime unavailable when runtimeSession is missing', () => {
    const execution = resolveRuntimeActionExecution({ runtimeSession: null });

    assert.equal(execution.useRuntime, false);
    assert.equal(execution.runtimeUnavailable, true);
    assert.equal(execution.reason, 'runtime_unavailable');
  });

  it('marks runtime unavailable when runtime request failed', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      runtimeFailed: true,
    });

    assert.equal(execution.useRuntime, false);
    assert.equal(execution.runtimeUnavailable, true);
    assert.equal(execution.reason, 'runtime_failed');
  });

  it('marks runtime unavailable on invalid runtime state flag', () => {
    const execution = resolveRuntimeActionExecution({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      invalidRuntimeState: true,
    });

    assert.equal(execution.reason, 'invalid_runtime_state');
    assert.equal(execution.runtimeUnavailable, true);
  });
});

describe('planLiveRuntimeClientAction', () => {
  it('runtime available → only runtime action for proposal accept', () => {
    const plan = planLiveRuntimeClientAction('proposal_accepted', {
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(plan.emitClientEvent, true);
    assert.equal(plan.callRuntimeTurn, true);
  });

  it('runtime unavailable → no runtime turn', () => {
    const plan = planLiveRuntimeClientAction('proposal_accepted', {
      runtimeSession: null,
    });

    assert.equal(plan.emitClientEvent, false);
    assert.equal(plan.callRuntimeTurn, false);
  });

  it('runtime available → resolve uses runtime turn', () => {
    const plan = planLiveRuntimeClientAction('resolve_session', {
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
    });

    assert.equal(plan.emitClientEvent, true);
    assert.equal(plan.callRuntimeTurn, true);
  });

  it('runtime unavailable → resolve does not call runtime', () => {
    const plan = planLiveRuntimeClientAction('resolve_session', {
      runtimeSession: null,
    });

    assert.equal(plan.callRuntimeTurn, false);
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
    assert.equal(state?.source, 'runtime_available');
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
