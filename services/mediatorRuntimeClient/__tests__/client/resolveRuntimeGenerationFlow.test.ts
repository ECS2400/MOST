import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  isRuntimeDirectMediatorMode,
  mapRuntimeBeatToMediatorMode,
  resolveRuntimeGenerationFlow,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function runtimeWithBeat(
  nextBeat: RuntimeSession['decision']['nextBeat'],
  overrides: {
    mayAutoAdvance?: boolean;
    pending?: Partial<RuntimeSession['pending']>;
  } = {}
) {
  return createMinimalRuntimeSuccess({
    runtimeSession: {
      ...createMinimalRuntimeSuccess().runtimeSession,
      decision: {
        ...createMinimalRuntimeSuccess().runtimeSession.decision,
        nextBeat,
        mayAutoAdvance: overrides.mayAutoAdvance ?? nextBeat === 'deliver_question',
        triggerHint: nextBeat === 'deliver_question' ? 'host_generate' : null,
      },
      pending: {
        ...createMinimalRuntimeSuccess().runtimeSession.pending,
        awaiting: 'nothing',
        awaitingFrom: [],
        satisfiedBy: [],
        ...overrides.pending,
      },
    },
  }).runtimeSession;
}

describe('mapRuntimeBeatToMediatorMode', () => {
  it('maps all runtime beats to dedicated MediatorMode values', () => {
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_opening'), 'opening_summary');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_question'), 'generate_question');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_answer_ack'), 'answer_ack');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_mid_summary'), 'mid_summary');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_final_summary'), 'final_summary');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_extension_summary'), 'extension_check');
    assert.equal(mapRuntimeBeatToMediatorMode('present_proposal'), 'proposed_solution');
    assert.equal(mapRuntimeBeatToMediatorMode('offer_extension'), 'extension_offer');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_extension_questions'), 'extension_question');
    assert.equal(mapRuntimeBeatToMediatorMode('deliver_closure'), 'closure');
    assert.equal(mapRuntimeBeatToMediatorMode('safety_intervention'), 'safety_intervention');
    assert.equal(mapRuntimeBeatToMediatorMode('await_user_action'), null);
  });

  it('marks new runtime modes as direct processMediationTurn modes', () => {
    assert.equal(isRuntimeDirectMediatorMode('extension_offer'), true);
    assert.equal(isRuntimeDirectMediatorMode('extension_question'), true);
    assert.equal(isRuntimeDirectMediatorMode('closure'), true);
    assert.equal(isRuntimeDirectMediatorMode('safety_intervention'), true);
    assert.equal(isRuntimeDirectMediatorMode('generate_question'), false);
  });
});

describe('resolveRuntimeGenerationFlow', () => {
  it('runtime deliver_question → generate_question', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question'),
      legacyMode: null,
    });

    assert.equal(resolution.mode, 'generate_question');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime deliver_final_summary → final_summary', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_final_summary'),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'final_summary');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime present_proposal → proposed_solution', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('present_proposal'),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'proposed_solution');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime offer_extension → extension_offer (not extension_question)', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('offer_extension', { mayAutoAdvance: false }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'extension_offer');
    assert.notEqual(resolution.mode, 'extension_question');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime deliver_extension_questions → extension_question', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_extension_questions', {
        mayAutoAdvance: true,
        pending: { awaiting: 'nothing' },
      }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'extension_question');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime deliver_closure → closure (not final_summary)', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_closure', { mayAutoAdvance: false }),
      legacyMode: 'final_summary',
    });

    assert.equal(resolution.mode, 'closure');
    assert.notEqual(resolution.mode, 'final_summary');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime safety_intervention → safety_intervention', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('safety_intervention', { mayAutoAdvance: false }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'safety_intervention');
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime await_user_action → null', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('await_user_action', { mayAutoAdvance: false }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime');
  });

  it('runtime deliver_answer_ack → null for auto-advance', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_answer_ack', { mayAutoAdvance: false }),
      legacyMode: 'answer_ack',
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime');
  });

  it('blocks question generation when pending awaits both replies', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question', {
        pending: { awaiting: 'both_replies' },
      }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime');
  });

  it('blocks question generation when pending awaits decision', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question', {
        pending: { awaiting: 'continue_decision' },
      }),
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime');
  });

  it('falls back when runtime is unavailable', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: null,
      legacyMode: 'mid_summary',
    });

    assert.equal(resolution.mode, 'mid_summary');
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'runtime_unavailable');
  });

  it('falls back when runtime failed', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question'),
      legacyMode: 'generate_question',
      runtimeFailed: true,
    });

    assert.equal(resolution.mode, 'generate_question');
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'runtime_failed');
  });

  it('falls back on invalid runtime state flag', () => {
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question'),
      legacyMode: 'generate_question',
      invalidRuntimeState: true,
    });

    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'invalid_runtime_state');
  });

  it('does not duplicate generate turn when runtime blocks auto-advance', () => {
    const blocked = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('await_user_action', { mayAutoAdvance: false }),
      legacyMode: 'generate_question',
    });
    const allowed = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWithBeat('deliver_question'),
      legacyMode: 'generate_question',
    });

    assert.equal(blocked.mode, null);
    assert.equal(allowed.mode, 'generate_question');
  });

  it('does not call lazy legacy getter when runtime is available', () => {
    let called = false;
    const runtimeSession = runtimeWithBeat('deliver_question');

    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession,
      getLegacyMode: () => {
        called = true;
        return 'generate_question';
      },
    });

    assert.equal(called, false);
    assert.equal(resolution.source, 'runtime');
    assert.equal(resolution.mode, 'generate_question');
  });

  it('calls lazy legacy getter when runtime is unavailable', () => {
    let called = false;

    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: null,
      getLegacyMode: () => {
        called = true;
        return 'mid_summary';
      },
    });

    assert.equal(called, true);
    assert.equal(resolution.mode, 'mid_summary');
    assert.equal(resolution.source, 'legacy_fallback');
  });
});
