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
    const resolved = resolveLiveProgressPercent(runtime.runtimeSession);
    assert.equal(resolved, runtime.runtimeSession.progress.completionEstimate);
  });

  it('returns zero when runtime is unavailable', () => {
    assert.equal(resolveLiveProgressPercent(null, true), 0);
  });

  it('resolves runtime stage label from labelKey', () => {
    const runtime = createMinimalRuntimeSuccess();
    const label = resolveRuntimeStageLabel(runtime.runtimeSession.progress.labelKey, 'en');
    assert.ok(label);
    assert.match(label!, /opening|story|understanding|needs|repair|agreement|extension|proposal|closing|safety/i);
  });

  it('builds header label with percent and stage when runtimeSession exists', () => {
    const runtime = createMinimalRuntimeSuccess();
    const header = resolveLivePhaseHeaderLabel(runtime.runtimeSession, 'en');
    assert.match(header, /%/);
  });

  it('returns recovery label when runtime is unavailable', () => {
    assert.equal(
      resolveLivePhaseHeaderLabel(null, 'en', {
        runtimeUnavailable: true,
        recoveryLabel: 'Runtime unavailable',
      }),
      'Runtime unavailable'
    );
  });
});
