import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  mapRuntimeClosureNavigationOutcome,
  resolveEffectiveClosureDbStatus,
  resolveRuntimeClosureAction,
  shouldPerformRuntimeClosureNavigation,
} from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function runtimeWithClosure(
  outcome: RuntimeSession['session']['outcome'],
  closure: Partial<RuntimeSession['closure']>
): RuntimeSession {
  const base = createMinimalRuntimeSuccess().runtimeSession;
  return {
    ...base,
    session: {
      ...base.session,
      outcome,
    },
    closure: {
      ...base.closure,
      ...closure,
    },
  };
}

describe('resolveRuntimeClosureAction', () => {
  it('resolved + navigateToClosure=true triggers runtime navigation', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('resolved', {
        directive: 'close_on_accept',
        navigateToClosure: true,
        suggestedDbStatus: 'resolved',
      }),
    });

    assert.equal(action.shouldNavigate, true);
    assert.equal(action.source, 'runtime_available');
    assert.equal(action.directive, 'close_on_accept');
    assert.equal(action.suggestedDbStatus, 'resolved');
  });

  it('closed_without_agreement triggers runtime navigation', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('closed_without_agreement', {
        directive: 'close_without_agreement',
        navigateToClosure: true,
        suggestedDbStatus: 'pending_agreements',
      }),
    });

    assert.equal(action.shouldNavigate, true);
    assert.equal(action.source, 'runtime_available');
    assert.equal(action.directive, 'close_without_agreement');
    assert.equal(action.suggestedDbStatus, 'pending_agreements');
  });

  it('safety_stopped triggers runtime navigation', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('safety_stopped', {
        directive: 'safety_close',
        navigateToClosure: true,
        suggestedDbStatus: null,
      }),
    });

    assert.equal(action.shouldNavigate, true);
    assert.equal(action.source, 'runtime_available');
    assert.equal(action.directive, 'safety_close');
  });

  it('navigateToClosure=false does not trigger runtime navigation', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('resolved', {
        directive: 'close_on_accept',
        navigateToClosure: false,
        suggestedDbStatus: 'resolved',
      }),
    });

    assert.equal(action.shouldNavigate, false);
    assert.equal(action.source, 'runtime_available');
  });

  it('directive none falls back to legacy closure flow', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('resolved', {
        directive: 'none',
        navigateToClosure: true,
        suggestedDbStatus: 'resolved',
      }),
    });

    assert.equal(action.shouldNavigate, false);
    assert.equal(action.source, 'runtime_available');
    assert.equal(action.directive, 'none');
  });

  it('missing runtimeSession falls back to legacy closure flow', () => {
    const action = resolveRuntimeClosureAction({ runtimeSession: null });

    assert.equal(action.shouldNavigate, false);
    assert.equal(action.source, 'runtime_unavailable');
  });

  it('non-terminal outcome with navigate flag falls back to legacy', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('ongoing', {
        directive: 'close_on_accept',
        navigateToClosure: true,
        suggestedDbStatus: 'resolved',
      }),
    });

    assert.equal(action.shouldNavigate, false);
    assert.equal(action.source, 'runtime_available');
  });

  it('duplicate invocation guard allows only one navigation', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('resolved', {
        directive: 'close_on_accept',
        navigateToClosure: true,
        suggestedDbStatus: 'resolved',
      }),
    });

    assert.equal(shouldPerformRuntimeClosureNavigation(action, false), true);
    assert.equal(shouldPerformRuntimeClosureNavigation(action, true), false);
  });

  it('maps closed_without_agreement to unresolved_but_closed navigation outcome', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('closed_without_agreement', {
        directive: 'close_without_agreement',
        navigateToClosure: true,
        suggestedDbStatus: 'pending_agreements',
      }),
    });

    assert.equal(
      mapRuntimeClosureNavigationOutcome(action, 'closed_without_agreement'),
      'unresolved_but_closed'
    );
    assert.equal(
      resolveEffectiveClosureDbStatus(action, 'closed_without_agreement'),
      'pending_agreements'
    );
  });

  it('maps safety_stopped to pending_agreements when suggestedDbStatus is absent', () => {
    const action = resolveRuntimeClosureAction({
      runtimeSession: runtimeWithClosure('safety_stopped', {
        directive: 'safety_close',
        navigateToClosure: true,
        suggestedDbStatus: null,
      }),
    });

    assert.equal(resolveEffectiveClosureDbStatus(action, 'safety_stopped'), 'pending_agreements');
    assert.equal(mapRuntimeClosureNavigationOutcome(action, 'safety_stopped'), 'unresolved_but_closed');
  });
});
