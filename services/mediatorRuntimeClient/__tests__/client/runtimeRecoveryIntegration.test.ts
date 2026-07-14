import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { recomposeRuntimeSessionFromPersistedState } from '@/services/mediatorRuntimeClient/recomposePersistedRuntimeSession';
import {
  recoverMediationRuntimeSessionCore,
  type PersistRecoveredRuntimeSession,
} from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSessionCore';
import {
  buildRuntimeSessionLoadDiagnostics,
  resolveRuntimeSessionFromRow,
} from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import {
  resolveLiveRuntimeDevStatus,
  shouldCommitRuntimeSessionRefresh,
} from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

const MEDIATION_ID = 'med-recovery-integration';

type MediationRow = {
  mediation_state: ReturnType<typeof createBaselineMediationState> | null;
  session_memory: ReturnType<typeof createEmptySessionMemory> | null;
  mediator_runtime_session: RuntimeSession | null;
};

function createHostRow(): MediationRow {
  return {
    mediation_state: createBaselineMediationState(),
    session_memory: createEmptySessionMemory(),
    mediator_runtime_session: null,
  };
}

function createMockPersist(store: Map<string, MediationRow>): PersistRecoveredRuntimeSession {
  return async ({ mediationId, sessionMemory, runtimeSession }) => {
    const row = store.get(mediationId);
    if (!row) {
      return {
        rawRuntimeSession: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      };
    }
    row.session_memory = sessionMemory;
    row.mediator_runtime_session = runtimeSession;
    return {
      rawRuntimeSession: row.mediator_runtime_session,
      error: null,
    };
  };
}

function simulateLoadFromStore(
  store: Map<string, MediationRow>,
  mediationId: string
): { runtimeSession: RuntimeSession | null; mediationState: MediationRow['mediation_state']; sessionMemory: MediationRow['session_memory'] } {
  const row = store.get(mediationId);
  return {
    mediationState: row?.mediation_state ?? null,
    sessionMemory: row?.session_memory ?? null,
    runtimeSession: resolveRuntimeSessionFromRow(row?.mediator_runtime_session ?? null),
  };
}

function simulateRefreshCommit(params: {
  requestId: number;
  latestRequestId: number;
  rawRuntimeSession: unknown;
}): RuntimeSession | null {
  const commitAllowed = shouldCommitRuntimeSessionRefresh({
    requestId: params.requestId,
    latestRequestId: params.latestRequestId,
    mounted: true,
    activeMediationId: MEDIATION_ID,
    currentMediationId: MEDIATION_ID,
  });
  if (!commitAllowed) {
    return null;
  }
  return resolveRuntimeSessionFromRow(params.rawRuntimeSession);
}

describe('runtime recovery integration (mocked Supabase)', () => {
  it('host recovers null runtimeSession, reload commits Runtime OK', async () => {
    const store = new Map<string, MediationRow>([[MEDIATION_ID, createHostRow()]]);
    const persist = createMockPersist(store);
    const loadedBefore = simulateLoadFromStore(store, MEDIATION_ID);

    assert.equal(loadedBefore.runtimeSession, null);
    assert.ok(loadedBefore.mediationState);
    assert.ok(loadedBefore.sessionMemory);

    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded: loadedBefore,
        role: 'host',
      },
      persist
    );

    assert.equal(recovery.recovered, true);
    assert.ok(recovery.runtimeSession);
    assert.equal(isRuntimeSessionShape(recovery.runtimeSession), true);

    const recomposed = recomposeRuntimeSessionFromPersistedState({
      mediationState: loadedBefore.mediationState!,
      sessionMemory: loadedBefore.sessionMemory!,
    });
    assert.deepEqual(
      store.get(MEDIATION_ID)?.mediator_runtime_session?.decision.nextBeat,
      recomposed?.decision.nextBeat
    );

    let latestRequestId = 1;
    const preRecoveryRequestId = latestRequestId;
    latestRequestId += 1;
    const recoveryRefreshRequestId = latestRequestId;

    const loadedAfter = simulateLoadFromStore(store, MEDIATION_ID);
    const committed = simulateRefreshCommit({
      requestId: recoveryRefreshRequestId,
      latestRequestId,
      rawRuntimeSession: loadedAfter.runtimeSession,
    });

    assert.equal(
      shouldCommitRuntimeSessionRefresh({
        requestId: preRecoveryRequestId,
        latestRequestId,
        mounted: true,
        activeMediationId: MEDIATION_ID,
        currentMediationId: MEDIATION_ID,
      }),
      false
    );
    assert.ok(committed);
    assert.equal(
      resolveLiveRuntimeDevStatus({
        runtimeFailed: false,
        hasValidRuntimeSession: isRuntimeSessionShape(committed),
      }),
      'ok'
    );

    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role: 'host',
      mediationId: MEDIATION_ID,
      loadAttempted: true,
      rowFound: true,
      rawRuntimeSession: loadedAfter.runtimeSession,
      supabaseErrorCode: null,
    });
    assert.equal(diagnostics.shapeValid, true);
  });

  it('UPDATE with no row returns persist_failed (RLS / missing row)', async () => {
    const store = new Map<string, MediationRow>();
    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded: {
          mediationState: createBaselineMediationState(),
          sessionMemory: createEmptySessionMemory(),
          runtimeSession: null,
        },
        role: 'host',
      },
      createMockPersist(store)
    );

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'persist_failed');
    assert.equal(recovery.runtimeSession, null);
  });

  it('partner role does not recover', async () => {
    const store = new Map<string, MediationRow>([[MEDIATION_ID, createHostRow()]]);
    const loaded = simulateLoadFromStore(store, MEDIATION_ID);
    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded,
        role: 'partner',
      },
      createMockPersist(store)
    );

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'partner_waits_for_host');
    assert.equal(store.get(MEDIATION_ID)?.mediator_runtime_session, null);
  });

  it('missing mediation_state reports bootstrap_required when all runtime columns null', async () => {
    const store = new Map<string, MediationRow>([
      [
        MEDIATION_ID,
        {
          mediation_state: null,
          session_memory: null,
          mediator_runtime_session: null,
        },
      ],
    ]);
    const loaded = simulateLoadFromStore(store, MEDIATION_ID);
    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded,
        role: 'host',
      },
      createMockPersist(store)
    );

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'bootstrap_required');
  });

  it('persisted shape is validated from returned mediator_runtime_session column', async () => {
    const invalidRuntime = { decision: {} } as unknown as RuntimeSession;
    const persist: PersistRecoveredRuntimeSession = async () => ({
      rawRuntimeSession: invalidRuntime,
      error: null,
    });

    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded: {
          mediationState: createBaselineMediationState(),
          sessionMemory: createEmptySessionMemory(),
          runtimeSession: null,
        },
        role: 'host',
      },
      persist
    );

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'persist_shape_invalid');
  });
});

describe('migration 027 host UPDATE policy audit', () => {
  const sql = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../supabase/migrations/027_mediation_couple_participant_rls.sql'
    ),
    'utf8'
  );

  it('Participants can update mediation session allows auth.uid() = user_id', () => {
    assert.match(sql, /Participants can update mediation session/);
    assert.match(sql, /auth\.uid\(\) = user_id/);
    assert.match(sql, /FOR UPDATE/);
  });
});
