import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  mapRuntimeBeatToLegacyMode,
  resolveRuntimeGenerationMode,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationMode';

describe('mapRuntimeBeatToLegacyMode', () => {
  it('maps beats with legacy MediatorMode equivalents', () => {
    assert.equal(mapRuntimeBeatToLegacyMode('deliver_opening'), 'opening_summary');
    assert.equal(mapRuntimeBeatToLegacyMode('deliver_question'), 'generate_question');
    assert.equal(mapRuntimeBeatToLegacyMode('deliver_mid_summary'), 'mid_summary');
    assert.equal(mapRuntimeBeatToLegacyMode('deliver_extension_summary'), 'extension_check');
    assert.equal(mapRuntimeBeatToLegacyMode('present_proposal'), 'proposed_solution');
    assert.equal(mapRuntimeBeatToLegacyMode('offer_extension'), null);
    assert.equal(mapRuntimeBeatToLegacyMode('deliver_closure'), null);
    assert.equal(mapRuntimeBeatToLegacyMode('safety_intervention'), null);
  });
});

describe('resolveRuntimeGenerationMode', () => {
  it('confirms legacy mode when intents match for generate_question', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        decision: {
          ...createMinimalRuntimeSuccess().runtimeSession.decision,
          nextBeat: 'deliver_question',
          mayAutoAdvance: true,
          triggerHint: 'host_generate',
        },
      },
    });

    const resolution = resolveRuntimeGenerationMode({
      runtimeSession: runtime.runtimeSession,
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'generate_question');
    assert.equal(resolution.source, 'runtime_confirmed');
    assert.equal(resolution.reason, 'intent_match');
  });

  it('falls back to legacy on kind_mismatch', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        decision: {
          ...createMinimalRuntimeSuccess().runtimeSession.decision,
          nextBeat: 'deliver_question',
          mayAutoAdvance: true,
          triggerHint: 'host_generate',
        },
      },
    });

    const resolution = resolveRuntimeGenerationMode({
      runtimeSession: runtime.runtimeSession,
      legacyMode: null,
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'kind_mismatch');
  });

  it('confirms runtime_waiting when both legacy and runtime block generation', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        decision: {
          ...createMinimalRuntimeSuccess().runtimeSession.decision,
          nextBeat: 'await_user_action',
          mayAutoAdvance: false,
          triggerHint: null,
        },
      },
    });

    const resolution = resolveRuntimeGenerationMode({
      runtimeSession: runtime.runtimeSession,
      legacyMode: null,
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime_confirmed');
    assert.equal(resolution.reason, 'runtime_waiting');
  });

  it('falls back when runtime beat has no legacy mode mapping', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        decision: {
          ...createMinimalRuntimeSuccess().runtimeSession.decision,
          nextBeat: 'offer_extension',
          mayAutoAdvance: false,
          triggerHint: null,
        },
      },
    });

    const resolution = resolveRuntimeGenerationMode({
      runtimeSession: runtime.runtimeSession,
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, 'generate_question');
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'runtime_has_no_legacy_mode');
  });

  it('falls back when runtimeSession is unavailable', () => {
    const resolution = resolveRuntimeGenerationMode({
      runtimeSession: null,
      legacyMode: 'mid_summary',
    });

    assert.equal(resolution.mode, 'mid_summary');
    assert.equal(resolution.source, 'legacy_fallback');
    assert.equal(resolution.reason, 'runtime_unavailable');
  });
});
