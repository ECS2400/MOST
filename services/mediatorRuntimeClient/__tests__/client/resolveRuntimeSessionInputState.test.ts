import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  canSubmitLiveMessage,
  computeLegacyInputVisible,
  resolveRuntimeInputState,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';

const LEGACY_OPEN = {
  showDecisionPanel: false,
  showProposalPanel: false,
  sessionFinished: false,
  awaitingProposalDecision: false,
  sessionUnresolvedClosed: false,
  paused: false,
};

describe('resolveRuntimeSessionInputState', () => {
  it('computeLegacyInputVisible mirrors live.tsx guard', () => {
    assert.equal(computeLegacyInputVisible(LEGACY_OPEN), true);
    assert.equal(
      computeLegacyInputVisible({ ...LEGACY_OPEN, showDecisionPanel: true }),
      false
    );
  });

  it('shows input when legacy allows and runtime has no block', () => {
    const runtime = createMinimalRuntimeSuccess();
    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, true);
    assert.equal(state.enabled, true);
    assert.equal(state.source, 'runtime');
    assert.equal(state.reason, 'available');
    assert.equal(state.placeholder, 'Write a message...');
  });

  it('hides input when runtime presentation.hideInput is true', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        presentation: {
          ...createMinimalRuntimeSuccess().runtimeSession.presentation,
          hideInput: true,
        },
        session: {
          ...createMinimalRuntimeSuccess().runtimeSession.session,
          outcome: 'resolved',
        },
      },
    });

    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.enabled, false);
    assert.equal(state.source, 'runtime');
    assert.equal(state.reason, 'session_finished');
  });

  it('hides input for safety_hold stage', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        session: {
          ...createMinimalRuntimeSuccess().runtimeSession.session,
          stage: 'safety_hold',
          outcome: 'safety_stopped',
        },
      },
    });

    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.reason, 'safety_hold');
    assert.equal(state.source, 'runtime');
  });

  it('falls back to legacy when runtimeSession is null', () => {
    const state = resolveRuntimeInputState({
      runtimeSession: null,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, true);
    assert.equal(state.source, 'legacy');
  });

  it('keeps legacy panel guard when decision panel is open', () => {
    const runtime = createMinimalRuntimeSuccess();
    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      legacy: { ...LEGACY_OPEN, showDecisionPanel: true },
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.source, 'legacy');
    assert.equal(state.reason, 'awaiting_decision');
  });

  it('disables input during processing without hiding', () => {
    const runtime = createMinimalRuntimeSuccess();
    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: true },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, true);
    assert.equal(state.enabled, false);
    assert.equal(state.reason, 'processing');
  });

  it('canSubmitLiveMessage requires enabled state and non-empty text', () => {
    const enabledState = resolveRuntimeInputState({
      runtimeSession: null,
      legacy: LEGACY_OPEN,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(canSubmitLiveMessage(enabledState, 'hello'), true);
    assert.equal(canSubmitLiveMessage(enabledState, '   '), false);

    const disabledState = { ...enabledState, enabled: false };
    assert.equal(canSubmitLiveMessage(disabledState, 'hello'), false);
  });
});
