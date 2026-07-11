import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  compareRuntimeNextBeat,
  mapLegacyGenerateModeToIntent,
  mapRuntimeNextBeatToIntent,
} from '@/services/mediatorRuntimeClient/compareRuntimeNextBeat';

describe('mapLegacyGenerateModeToIntent', () => {
  it('maps all MediatorMode values returned by resolveGenerateMode', () => {
    assert.equal(mapLegacyGenerateModeToIntent('opening_summary'), 'opening');
    assert.equal(mapLegacyGenerateModeToIntent('generate_question'), 'question');
    assert.equal(mapLegacyGenerateModeToIntent('answer_ack'), 'answer_ack');
    assert.equal(mapLegacyGenerateModeToIntent('mid_summary'), 'mid_summary');
    assert.equal(mapLegacyGenerateModeToIntent('final_summary'), 'final_summary');
    assert.equal(mapLegacyGenerateModeToIntent('extension_check'), 'extension_summary');
    assert.equal(mapLegacyGenerateModeToIntent('proposed_solution'), 'proposal');
    assert.equal(mapLegacyGenerateModeToIntent(null), 'await_user_action');
  });
});

describe('mapRuntimeNextBeatToIntent', () => {
  it('maps all MediatorBeat values from runtimeSession.decision', () => {
    assert.equal(mapRuntimeNextBeatToIntent('deliver_opening'), 'opening');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_question'), 'question');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_answer_ack'), 'answer_ack');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_mid_summary'), 'mid_summary');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_final_summary'), 'final_summary');
    assert.equal(mapRuntimeNextBeatToIntent('offer_extension'), 'extension_offer');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_extension_questions'), 'extension_question');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_extension_summary'), 'extension_summary');
    assert.equal(mapRuntimeNextBeatToIntent('present_proposal'), 'proposal');
    assert.equal(mapRuntimeNextBeatToIntent('await_user_action'), 'await_user_action');
    assert.equal(mapRuntimeNextBeatToIntent('deliver_closure'), 'closure');
    assert.equal(mapRuntimeNextBeatToIntent('safety_intervention'), 'safety');
  });
});

describe('compareRuntimeNextBeat', () => {
  it('reports match when legacy question aligns with runtime deliver_question', () => {
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

    const comparison = compareRuntimeNextBeat({
      runtimeSession: runtime.runtimeSession,
      legacyMode: 'generate_question',
    });

    assert.equal(comparison.intentsMatch, true);
    assert.deepEqual(comparison.mismatchReasons, []);
  });

  it('reports match when legacy null maps to await_user_action', () => {
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

    const comparison = compareRuntimeNextBeat({
      runtimeSession: runtime.runtimeSession,
      legacyMode: null,
    });

    assert.equal(comparison.intentsMatch, true);
    assert.deepEqual(comparison.mismatchReasons, []);
  });

  it('reports mismatch when legacy blocked but runtime wants generation', () => {
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

    const comparison = compareRuntimeNextBeat({
      runtimeSession: runtime.runtimeSession,
      legacyMode: null,
    });

    assert.equal(comparison.intentsMatch, false);
    assert.ok(comparison.mismatchReasons.includes('intent_mismatch'));
    assert.ok(comparison.mismatchReasons.includes('legacy_blocked_runtime_generates'));
  });

  it('reports runtime_unavailable when runtimeSession is missing', () => {
    const comparison = compareRuntimeNextBeat({
      runtimeSession: null,
      legacyMode: 'generate_question',
    });

    assert.equal(comparison.intentsMatch, false);
    assert.deepEqual(comparison.mismatchReasons, ['runtime_unavailable']);
  });

  it('maps proposed_solution to proposal intent', () => {
    const runtime = createMinimalRuntimeSuccess({
      runtimeSession: {
        ...createMinimalRuntimeSuccess().runtimeSession,
        decision: {
          ...createMinimalRuntimeSuccess().runtimeSession.decision,
          nextBeat: 'present_proposal',
          mayAutoAdvance: false,
          triggerHint: 'host_generate',
        },
      },
    });

    const comparison = compareRuntimeNextBeat({
      runtimeSession: runtime.runtimeSession,
      legacyMode: 'proposed_solution',
    });

    assert.equal(comparison.legacyIntent, 'proposal');
    assert.equal(comparison.runtimeIntent, 'proposal');
    assert.equal(comparison.intentsMatch, true);
  });
});
