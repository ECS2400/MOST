/**
 * RuntimeSession persistence helpers — unit tests (Phase UI-B.3b.4).
 *
 *   npm run test:mediator:client
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import {
  buildMediationRuntimePersistencePatch,
  parseLoadedMediationRuntimeRow,
  parseStoredRuntimeSession,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';

describe('mediationRuntimeSessionPersistence', () => {
  it('buildMediationRuntimePersistencePatch stores runtimeSession on mediator_runtime_session', () => {
    const runtime = createMinimalRuntimeSuccess();
    const patch = buildMediationRuntimePersistencePatch(runtime);

    assert.deepEqual(patch.mediator_runtime_session, runtime.runtimeSession);
    assert.equal(patch.mediator_runtime_session.session.turnOrdinal, runtime.runtimeMetadata.turnNumber);
    assert.equal(patch.mediation_state, runtime.mediationState);
    assert.equal(patch.session_memory, runtime.sessionMemory);
  });

  it('parseStoredRuntimeSession accepts a valid RuntimeSession object', () => {
    const runtime = createMinimalRuntimeSuccess();
    const parsed = parseStoredRuntimeSession(runtime.runtimeSession);

    assert.ok(parsed);
    assert.equal(parsed?.session.currentGoal, runtime.runtimeSession.session.currentGoal);
  });

  it('parseStoredRuntimeSession returns null for invalid shapes', () => {
    assert.equal(parseStoredRuntimeSession(null), null);
    assert.equal(parseStoredRuntimeSession([]), null);
    assert.equal(parseStoredRuntimeSession({ decision: {} }), null);
    assert.equal(parseStoredRuntimeSession('not-json'), null);
  });

  it('parseLoadedMediationRuntimeRow maps mediation columns including runtimeSession', () => {
    const runtime = createMinimalRuntimeSuccess();
    const loaded = parseLoadedMediationRuntimeRow({
      mediation_state: runtime.mediationState,
      session_memory: runtime.sessionMemory,
      mediator_runtime_session: runtime.runtimeSession,
    });

    assert.equal(loaded.mediationState, runtime.mediationState);
    assert.equal(loaded.sessionMemory, runtime.sessionMemory);
    assert.deepEqual(loaded.runtimeSession, runtime.runtimeSession);
  });

  it('parseLoadedMediationRuntimeRow tolerates missing runtimeSession column', () => {
    const runtime = createMinimalRuntimeSuccess();
    const loaded = parseLoadedMediationRuntimeRow({
      mediation_state: runtime.mediationState,
      session_memory: runtime.sessionMemory,
    });

    assert.equal(loaded.runtimeSession, null);
  });
});
