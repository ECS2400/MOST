import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  canSubmitLiveMessage,
  resolveRuntimeInputState,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';

describe('resolveRuntimeSessionInputState', () => {
  it('shows input when runtime has no block', () => {
    const runtime = createMinimalRuntimeSuccess();
    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, true);
    assert.equal(state.enabled, true);
    assert.equal(state.source, 'runtime_available');
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
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.enabled, false);
    assert.equal(state.source, 'runtime_available');
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
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.reason, 'safety_hold');
    assert.equal(state.source, 'runtime_available');
  });

  it('hides input when runtime is unavailable', () => {
    const state = resolveRuntimeInputState({
      runtimeSession: null,
      runtimeUnavailable: true,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, false);
    assert.equal(state.source, 'runtime_unavailable');
    assert.equal(state.reason, 'runtime_unavailable');
  });

  it('disables input during processing without hiding', () => {
    const runtime = createMinimalRuntimeSuccess();
    const state = resolveRuntimeInputState({
      runtimeSession: runtime.runtimeSession,
      technical: { sending: false, processing: true },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(state.visible, true);
    assert.equal(state.enabled, false);
    assert.equal(state.reason, 'processing');
  });

  it('canSubmitLiveMessage requires enabled state and non-empty text', () => {
    const enabledState = resolveRuntimeInputState({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      technical: { sending: false, processing: false },
      defaultPlaceholder: 'Write a message...',
    });

    assert.equal(canSubmitLiveMessage(enabledState, 'hello'), true);
    assert.equal(canSubmitLiveMessage(enabledState, '   '), false);

    const disabledState = { ...enabledState, enabled: false };
    assert.equal(canSubmitLiveMessage(disabledState, 'hello'), false);
  });
});
