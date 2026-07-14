/**
 * Stale mediator error banner — cleared on successful atomic turn.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type MediatorTurnOutcome = 'failed' | 'success';

interface ErrorBannerState {
  error: string;
  mediatorTypingState: 'idle' | 'requesting' | 'retrying' | 'failed';
  hasRetryHandler: boolean;
}

function applyTurnStart(state: ErrorBannerState): ErrorBannerState {
  return {
    ...state,
    error: '',
    mediatorTypingState: 'requesting',
  };
}

function applyTurnOutcome(
  state: ErrorBannerState,
  outcome: MediatorTurnOutcome,
  recoverable = false
): ErrorBannerState {
  if (outcome === 'success') {
    return {
      error: '',
      mediatorTypingState: 'idle',
      hasRetryHandler: false,
    };
  }

  if (recoverable) {
    return {
      error: 'Mościk chwilowo nie może odpowiedzieć.',
      mediatorTypingState: 'failed',
      hasRetryHandler: true,
    };
  }

  return {
    error: 'Mościk chwilowo nie może odpowiedzieć.',
    mediatorTypingState: 'failed',
    hasRetryHandler: false,
  };
}

function errorBannerVisible(state: ErrorBannerState): boolean {
  return state.error.trim().length > 0;
}

describe('stale mediator error state', () => {
  it('turn 1 fails → error visible', () => {
    const started = applyTurnStart({ error: '', mediatorTypingState: 'idle', hasRetryHandler: false });
    const failed = applyTurnOutcome(started, 'failed', true);
    assert.equal(errorBannerVisible(failed), true);
    assert.equal(failed.hasRetryHandler, true);
  });

  it('retry succeeds → error removed', () => {
    const failed = applyTurnOutcome(
      { error: '', mediatorTypingState: 'idle', hasRetryHandler: false },
      'failed',
      true
    );
    const retryStart = applyTurnStart(failed);
    const succeeded = applyTurnOutcome(retryStart, 'success');
    assert.equal(errorBannerVisible(succeeded), false);
    assert.equal(succeeded.mediatorTypingState, 'idle');
    assert.equal(succeeded.hasRetryHandler, false);
  });

  it('next successful turn → error remains hidden', () => {
    const afterRetry = applyTurnOutcome(
      applyTurnStart({ error: '', mediatorTypingState: 'failed', hasRetryHandler: true }),
      'success'
    );
    const nextTurn = applyTurnOutcome(applyTurnStart(afterRetry), 'success');
    assert.equal(errorBannerVisible(nextTurn), false);
  });

  it('partner receives cleared state when host turn succeeds (no persisted error)', () => {
    const hostFailed = applyTurnOutcome(
      { error: '', mediatorTypingState: 'idle', hasRetryHandler: false },
      'failed',
      true
    );
    const hostSucceeded = applyTurnOutcome(applyTurnStart(hostFailed), 'success');
    const partnerView = { ...hostSucceeded };
    assert.equal(errorBannerVisible(partnerView), false);
    assert.equal(partnerView.mediatorTypingState, 'idle');
  });
});
