import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  createRuntimeSessionFixture,
  type RuntimeSessionFixtureOverrides,
} from '@/services/mediatorRuntimeClient/__tests__/client/runtimeSessionFixtures';
import {
  mapRuntimeSessionStageForTests,
  resolveRuntimeSessionFlow,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function runtimeWith(overrides: RuntimeSessionFixtureOverrides = {}): RuntimeSession {
  return createRuntimeSessionFixture(overrides);
}

describe('resolveRuntimeSessionFlow', () => {
  it('maps runtime session to live flow when runtime is available', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      questionNumberHint: 8,
    });

    assert.equal(resolution.source, 'runtime_available');
    assert.equal(resolution.reason, 'runtime_available');
    assert.equal(resolution.flow.stage, 'questions');
    assert.equal(resolution.flow.questionNumber, 8);
  });

  it('returns recovery flow when runtime is unavailable (production default)', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
    });

    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.flow.maxQuestions, 0);
  });

  it('maps proposal stage from runtime proposal phase and pending', () => {
    const runtimeSession = runtimeWith({
      session: { outcome: 'proposal_pending', stage: 'proposal' },
      proposal: { phase: 'presented' },
      pending: { awaiting: 'proposal_decision' },
      decision: {
        blockedReason: 'awaiting_proposal_decision',
        nextBeat: 'await_user_action',
      },
    });

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession,
    });

    assert.equal(resolution.flow.stage, 'awaiting_proposal_decision');
    assert.equal(resolution.flow.questionPhase, 'resolution');
  });

  it('maps extension stage from runtime extension flags', () => {
    const runtimeSession = runtimeWith({
      session: {
        outcome: 'extension_active',
        stage: 'extension',
        isExtensionActive: true,
      },
      decision: { nextBeat: 'deliver_extension_questions', blockedReason: null },
    });

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession,
    });

    assert.equal(resolution.flow.stage, 'extension');
    assert.equal(resolution.flow.extensionActive, true);
    assert.equal(resolution.flow.questionPhase, 'extension');
    assert.equal(resolution.flow.maxQuestions, 20);
  });

  it('maps closure stage to finished when runtime outcome is resolved', () => {
    const runtimeSession = runtimeWith({
      session: { outcome: 'resolved', stage: 'closing' },
      closure: {
        directive: 'close_on_accept',
        navigateToClosure: true,
        suggestedDbStatus: 'resolved',
      },
      decision: { nextBeat: 'deliver_closure', blockedReason: 'session_finished' },
    });

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession,
    });

    assert.equal(resolution.flow.stage, 'finished');
  });

  it('maps safety stage to finished when safety is stopped', () => {
    const runtimeSession = runtimeWith({
      session: { outcome: 'safety_stopped', stage: 'safety_hold' },
      closure: { directive: 'safety_close', navigateToClosure: true },
      decision: { nextBeat: 'safety_intervention', blockedReason: 'safety_hold' },
    });

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession,
    });

    assert.equal(resolution.flow.stage, 'finished');
    assert.equal(mapRuntimeSessionStageForTests(runtimeSession), 'finished');
  });

  it('returns recovery flow on invalid runtime state (production default)', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      invalidRuntimeState: true,
    });

    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.reason, 'invalid_runtime_state');
    assert.equal(resolution.flow.maxQuestions, 0);
  });

  it('maps awaiting_main_decision from continue pending and needs_extension_offer', () => {
    const runtimeSession = runtimeWith({
      session: { outcome: 'needs_extension_offer', stage: 'closing' },
      pending: { awaiting: 'continue_decision' },
      decision: {
        blockedReason: 'awaiting_continue_decision',
        nextBeat: 'await_user_action',
      },
    });

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession,
    });

    assert.equal(resolution.flow.stage, 'awaiting_main_decision');
    assert.equal(resolution.flow.questionPhase, 'resolution');
  });
});
