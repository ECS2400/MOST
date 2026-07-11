import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  resolveLivePhaseHeaderLabel,
  resolveLiveProgressPercent,
  resolveRuntimeStageLabel,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionProgressDisplay';

describe('resolveRuntimeSessionProgressDisplay', () => {
  it('uses completionEstimate when runtimeSession is present', () => {
    const runtime = createMinimalRuntimeSuccess();
    const legacy = 42;
    const resolved = resolveLiveProgressPercent(runtime.runtimeSession, legacy);
    assert.equal(resolved, runtime.runtimeSession.progress.completionEstimate);
    assert.notEqual(resolved, legacy);
  });

  it('falls back to legacy progress when runtimeSession is null', () => {
    assert.equal(resolveLiveProgressPercent(null, 55), 55);
  });

  it('resolves runtime stage label from labelKey', () => {
    const runtime = createMinimalRuntimeSuccess();
    const label = resolveRuntimeStageLabel(runtime.runtimeSession.progress.labelKey, 'en');
    assert.ok(label);
    assert.match(label!, /opening|story|understanding|needs|repair|agreement|extension|proposal|closing|safety/i);
  });

  it('builds header label with percent and stage when runtimeSession exists', () => {
    const runtime = createMinimalRuntimeSuccess();
    const header = resolveLivePhaseHeaderLabel(
      runtime.runtimeSession,
      'Question 3 of 15 · Legacy',
      'en'
    );
    assert.match(header, /%/);
    assert.doesNotMatch(header, /Question 3 of 15/);
  });

  it('keeps legacy header label when runtimeSession is null', () => {
    const legacy = 'Question 3 of 15 · Legacy';
    assert.equal(resolveLivePhaseHeaderLabel(null, legacy, 'en'), legacy);
  });
});
