import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  mapRuntimeSessionToWaitingKind,
  resolveLiveContinueWaitingDisplay,
  resolveLiveProposalWaitingDisplay,
  resolveLiveWaitingAnswerDisplay,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionWaitingDisplay';

describe('resolveRuntimeSessionWaitingDisplay', () => {
  it('maps both_replies pending to waiting_both', () => {
    const runtime = createMinimalRuntimeSuccess();
    assert.equal(mapRuntimeSessionToWaitingKind(runtime.runtimeSession), 'waiting_both');
  });

  it('uses runtime label for answer waiting when session exists', () => {
    const runtime = createMinimalRuntimeSuccess();
    const display = resolveLiveWaitingAnswerDisplay(
      runtime.runtimeSession,
      'Legacy waiting text',
      'en',
      true
    );
    assert.equal(display.source, 'runtime');
    assert.equal(display.kind, 'waiting_both');
    assert.match(display.label, /both/i);
    assert.doesNotMatch(display.label, /Legacy waiting/);
  });

  it('falls back to legacy answer hint when runtimeSession is null', () => {
    const legacy = 'Waiting for partner to answer';
    const display = resolveLiveWaitingAnswerDisplay(null, legacy, 'en', true);
    assert.equal(display.source, 'legacy');
    assert.equal(display.label, legacy);
  });

  it('maps host_reply to waiting_host and adjusts label for host user', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        pending: {
          awaiting: 'host_reply',
          awaitingFrom: ['host'],
          satisfiedBy: ['host_message'],
        },
      },
    });
    const hostDisplay = resolveLiveWaitingAnswerDisplay(
      runtime.runtimeSession,
      'Legacy',
      'en',
      true
    );
    assert.equal(hostDisplay.kind, 'waiting_host');
    assert.match(hostDisplay.label, /your turn/i);

    const partnerDisplay = resolveLiveWaitingAnswerDisplay(
      runtime.runtimeSession,
      'Legacy',
      'en',
      false
    );
    assert.match(partnerDisplay.label, /host/i);
  });

  it('uses runtime label for proposal waiting when pending is proposal_decision', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        pending: {
          awaiting: 'proposal_decision',
          awaitingFrom: ['host', 'partner'],
          satisfiedBy: ['proposal_accepted', 'proposal_rejected'],
        },
      },
    });
    const display = resolveLiveProposalWaitingDisplay(
      runtime.runtimeSession,
      'Legacy proposal hint',
      'en',
      true
    );
    assert.equal(display.source, 'runtime');
    assert.equal(display.kind, 'waiting_proposal_decision');
    assert.match(display.label, /proposal/i);
  });

  it('uses runtime label for continue decision pending', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        pending: {
          awaiting: 'continue_decision',
          awaitingFrom: ['host', 'partner'],
          satisfiedBy: ['continue_session', 'resolve_session'],
        },
      },
    });
    const display = resolveLiveContinueWaitingDisplay(
      runtime.runtimeSession,
      'Legacy continue hint',
      'en'
    );
    assert.equal(display.source, 'runtime');
    assert.equal(display.kind, 'waiting_continue_decision');
    assert.match(display.label, /continue/i);
  });

  it('maps safety_hold stage to waiting_safety_acknowledgment', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        session: {
          ...createMinimalRuntimeSuccess().runtimeSession.session,
          stage: 'safety_hold',
          outcome: 'safety_stopped',
        },
        pending: {
          awaiting: 'safety_acknowledgment',
          awaitingFrom: ['host', 'partner'],
          satisfiedBy: [],
        },
      },
    });
    assert.equal(
      mapRuntimeSessionToWaitingKind(runtime.runtimeSession),
      'waiting_safety_acknowledgment'
    );
  });
});
