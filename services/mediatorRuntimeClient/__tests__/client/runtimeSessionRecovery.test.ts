import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  identifyRejectedRuntimeSessionShapeField,
  normalizeStoredRuntimeSession,
} from '@/services/mediatorRuntimeClient/normalizeStoredRuntimeSession';
import { recomposeRuntimeSessionFromPersistedState } from '@/services/mediatorRuntimeClient/recomposePersistedRuntimeSession';
import { shouldCommitRuntimeSessionRefresh } from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import { buildRuntimeSessionLoadDiagnostics } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';

describe('normalizeStoredRuntimeSession', () => {
  it('normalizes older compatible shape missing diagnostics', () => {
    const runtime = createMinimalRuntimeSuccess().runtimeSession;
    const { diagnostics: _removed, ...withoutDiagnostics } = runtime;

    const normalized = normalizeStoredRuntimeSession(withoutDiagnostics);
    assert.ok(normalized);
    assert.equal(normalized?.diagnostics.safetyLevel, 'none');
    assert.equal(identifyRejectedRuntimeSessionShapeField(withoutDiagnostics), 'diagnostics');
  });

  it('valid persisted session loads after normalization', () => {
    const runtime = createMinimalRuntimeSuccess().runtimeSession;
    const normalized = normalizeStoredRuntimeSession(runtime);
    assert.ok(normalized);
    assert.equal(normalized?.session.currentGoal, runtime.session.currentGoal);
  });
});

describe('recomposeRuntimeSessionFromPersistedState', () => {
  it('null runtimeSession + valid state/memory recomposes without new AI output', () => {
    const recomposed = recomposeRuntimeSessionFromPersistedState({
      mediationState: createBaselineMediationState(),
      sessionMemory: createEmptySessionMemory(),
    });

    assert.ok(recomposed);
    assert.equal(recomposed?.presentation.deliverables.length, 0);
    assert.ok(recomposed?.decision.nextBeat);
  });
});

describe('runtime recovery diagnostics', () => {
  it('RLS error is visible in diagnostics', () => {
    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role: 'partner',
      mediationId: 'med-1',
      loadAttempted: true,
      rowFound: false,
      rawRuntimeSession: null,
      supabaseErrorCode: '42501',
      supabaseErrorMessage: 'permission denied for table mediations',
    });

    assert.equal(diagnostics.supabaseErrorCode, '42501');
    assert.match(diagnostics.supabaseErrorMessage ?? '', /permission denied/i);
  });

  it('stale request does not overwrite successful recovery commit', () => {
    assert.equal(
      shouldCommitRuntimeSessionRefresh({
        requestId: 1,
        latestRequestId: 2,
        mounted: true,
        activeMediationId: 'med-1',
        currentMediationId: 'med-1',
      }),
      false
    );
    assert.equal(
      shouldCommitRuntimeSessionRefresh({
        requestId: 2,
        latestRequestId: 2,
        mounted: true,
        activeMediationId: 'med-1',
        currentMediationId: 'med-1',
      }),
      true
    );
  });
});