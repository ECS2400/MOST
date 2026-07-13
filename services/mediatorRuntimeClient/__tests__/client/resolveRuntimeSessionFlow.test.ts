import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  mapRuntimeSessionStageForTests,
  resolveRuntimeSessionFlow,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import type { LiveSessionFlow } from '@/services/liveMediation';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

const LEGACY_DEFAULT: LiveSessionFlow = {
  stage: 'questions',
  questionNumber: 8,
  maxQuestions: 15,
  questionPhase: 'deepening',
  extensionActive: false,
};

function runtimeWith(overrides: Partial<RuntimeSession> & {
  session?: Partial<RuntimeSession['session']>;
  pending?: Partial<RuntimeSession['pending']>;
  proposal?: Partial<RuntimeSession['proposal']>;
  closure?: Partial<RuntimeSession['closure']>;
  decision?: Partial<RuntimeSession['decision']>;
} = {}): RuntimeSession {
  const base = createMinimalRuntimeSuccess().runtimeSession;
  return {
    ...base,
    ...overrides,
    session: { ...base.session, ...overrides.session },
    pending: { ...base.pending, ...overrides.pending },
    proposal: { ...base.proposal, ...overrides.proposal },
    closure: { ...base.closure, ...overrides.closure },
    decision: { ...base.decision, ...overrides.decision },
  };
}

describe('resolveRuntimeSessionFlow', () => {
  it('maps runtime session to live flow when runtime is available', () => {
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      legacySessionFlow: LEGACY_DEFAULT,
      questionNumberHint: LEGACY_DEFAULT.questionNumber,
    });

    assert.equal(resolution.source, 'runtime');
    assert.equal(resolution.reason, 'runtime_available');
    assert.equal(resolution.flow.stage, 'questions');
    assert.equal(resolution.flow.questionNumber, LEGACY_DEFAULT.questionNumber);
  });

  it('does not call lazy legacy getter when runtime is available', () => {
    let called = false;
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      questionNumberHint: 5,
      getLegacySessionFlow: () => {
        called = true;
        return LEGACY_DEFAULT;
      },
    });

    assert.equal(called, false);
    assert.equal(resolution.source, 'runtime');
    assert.equal(resolution.flow.questionNumber, 5);
  });

  it('returns recovery flow when runtime is unavailable (production default)', () => {
    let called = false;
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
      getLegacySessionFlow: () => {
        called = true;
        return LEGACY_DEFAULT;
      },
    });

    assert.equal(called, false);
    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.flow.maxQuestions, 0);
  });

  it('calls lazy legacy getter when legacy explicitly allowed', () => {
    let called = false;
    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
      allowLegacyFallback: true,
      getLegacySessionFlow: () => {
        called = true;
        return LEGACY_DEFAULT;
      },
    });

    assert.equal(called, true);
    assert.equal(resolution.source, 'legacy_fallback');
    assert.deepEqual(resolution.flow, LEGACY_DEFAULT);
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
      legacySessionFlow: LEGACY_DEFAULT,
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
      legacySessionFlow: LEGACY_DEFAULT,
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
      legacySessionFlow: LEGACY_DEFAULT,
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
      legacySessionFlow: LEGACY_DEFAULT,
    });

    assert.equal(resolution.flow.stage, 'finished');
    assert.equal(mapRuntimeSessionStageForTests(runtimeSession), 'finished');
  });

  it('returns recovery flow when runtime is unavailable (production default)', () => {
    const legacy: LiveSessionFlow = {
      ...LEGACY_DEFAULT,
      stage: 'awaiting_main_decision',
      questionPhase: 'resolution',
    };

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: null,
      legacySessionFlow: legacy,
    });

    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.reason, 'runtime_unavailable');
    assert.equal(resolution.flow.maxQuestions, 0);
  });

  it('falls back to legacy flow when runtime failed and legacy allowed', () => {
    const legacy: LiveSessionFlow = {
      ...LEGACY_DEFAULT,
      stage: 'extension',
      extensionActive: true,
      questionPhase: 'extension',
    };

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      legacySessionFlow: legacy,
      runtimeFailed: true,
      allowLegacyFallback: true,
    });

    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'runtime_failed');
    assert.deepEqual(resolution.flow, legacy);
  });

  it('returns recovery flow on invalid runtime state (production default)', () => {
    const legacy: LiveSessionFlow = {
      ...LEGACY_DEFAULT,
      stage: 'awaiting_proposal_decision',
      questionPhase: 'resolution',
    };

    const resolution = resolveRuntimeSessionFlow({
      runtimeSession: createMinimalRuntimeSuccess().runtimeSession,
      legacySessionFlow: legacy,
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
      legacySessionFlow: LEGACY_DEFAULT,
    });

    assert.equal(resolution.flow.stage, 'awaiting_main_decision');
    assert.equal(resolution.flow.questionPhase, 'resolution');
  });
});
