import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createMinimalRuntimeSuccess } from '@/services/mediatorRuntimeClient/__tests__/client/fixtures';
import { buildMediationRuntimePersistencePatch } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { MEDIATOR_RUNTIME_ENGINE_VERSION } from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
import {
  PartnerMediationLinkError,
  resolveMediationPartnerLinkUpdate,
} from '@/services/mediationPartnerValidation';
import { recoverMediationRuntimeSessionCore } from '@/services/mediatorRuntimeClient/recoverMediationRuntimeSessionCore';
import {
  canHostRunRuntimeBootstrap,
  diagnoseMediationRuntimeBootstrap,
  isInvalidMediationParticipants,
  isRuntimeBootstrapRequired,
} from '@/services/mediatorRuntimeClient/resolveRuntimeBootstrapEligibility';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';
import { buildRuntimeSessionLoadDiagnostics } from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';

const HOST_ID = 'host-user-1';
const PARTNER_ID = 'partner-user-2';
const MEDIATION_ID = 'med-integrity-1';

describe('mediation creation defaults', () => {
  it('createMediationRecord insert includes partner_id null', async () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../mediationCreate.ts'),
      'utf8'
    );
    assert.match(source, /partner_id:\s*null/);
  });
});

describe('linkPartnerToMediation guards', () => {
  it('rejects host linking themselves as partner', () => {
    assert.throws(
      () =>
        resolveMediationPartnerLinkUpdate({
          hostUserId: HOST_ID,
          partnerId: HOST_ID,
          existingHostUserId: HOST_ID,
          existingPartnerId: null,
        }),
      (error: unknown) => {
        assert.ok(error instanceof PartnerMediationLinkError);
        assert.equal(error.code, 'SAME_USER');
        return true;
      }
    );
  });

  it('partner join sets different user id and preserves existing valid partner', () => {
    assert.equal(
      resolveMediationPartnerLinkUpdate({
        hostUserId: HOST_ID,
        partnerId: PARTNER_ID,
        existingHostUserId: HOST_ID,
        existingPartnerId: null,
      }),
      'update'
    );
    assert.equal(
      resolveMediationPartnerLinkUpdate({
        hostUserId: HOST_ID,
        partnerId: PARTNER_ID,
        existingHostUserId: HOST_ID,
        existingPartnerId: PARTNER_ID,
      }),
      'noop'
    );
    assert.throws(() =>
      resolveMediationPartnerLinkUpdate({
        hostUserId: HOST_ID,
        partnerId: 'other-partner',
        existingHostUserId: HOST_ID,
        existingPartnerId: PARTNER_ID,
      })
    );
  });
});

describe('join by invite RPC', () => {
  const sql = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../supabase/migrations/016_mediation_partner.sql'
    ),
    'utf8'
  );

  it('rejects host joining own mediation via OWN_MEDIATION', () => {
    assert.match(sql, /OWN_MEDIATION/);
    assert.match(sql, /v_row\.user_id = v_user_id/);
  });

  it('sets partner_id to joining user only when null', () => {
    assert.match(sql, /IF v_row\.partner_id IS NULL THEN/);
    assert.match(sql, /partner_id = v_user_id/);
  });
});

describe('runtime bootstrap eligibility', () => {
  it('detects invalid participants when host equals partner', () => {
    assert.equal(isInvalidMediationParticipants(HOST_ID, HOST_ID), true);
    assert.equal(
      diagnoseMediationRuntimeBootstrap({
        hostUserId: HOST_ID,
        partnerId: HOST_ID,
        rowFound: true,
        mediationStatePresent: false,
        sessionMemoryPresent: false,
        runtimeSessionPresent: false,
      }),
      'invalid_participants'
    );
  });

  it('diagnoses all-null runtime columns as bootstrap_required', () => {
    assert.equal(
      isRuntimeBootstrapRequired({
        mediationStatePresent: false,
        sessionMemoryPresent: false,
        runtimeSessionPresent: false,
      }),
      true
    );
    assert.equal(
      diagnoseMediationRuntimeBootstrap({
        hostUserId: HOST_ID,
        partnerId: PARTNER_ID,
        rowFound: true,
        mediationStatePresent: false,
        sessionMemoryPresent: false,
        runtimeSessionPresent: false,
      }),
      'bootstrap_required'
    );
  });

  it('host bootstrap requires distinct partner', () => {
    assert.equal(canHostRunRuntimeBootstrap(HOST_ID, PARTNER_ID), true);
    assert.equal(canHostRunRuntimeBootstrap(HOST_ID, null), false);
    assert.equal(canHostRunRuntimeBootstrap(HOST_ID, HOST_ID), false);
  });

  it('allows opening_summary bootstrap without persisted runtime session', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: null,
        mode: 'opening_summary',
        force: true,
      }),
      false
    );
  });
});

describe('recovery does not fake-recompose bootstrap-required rows', () => {
  it('returns bootstrap_required when all runtime columns are null', async () => {
    const recovery = await recoverMediationRuntimeSessionCore(
      {
        mediationId: MEDIATION_ID,
        loaded: {
          mediationState: null,
          sessionMemory: null,
          runtimeSession: null,
        },
        role: 'host',
      },
      async () => ({
        rawRuntimeSession: null,
        error: { code: 'unexpected', message: 'should not persist' },
      })
    );

    assert.equal(recovery.recovered, false);
    assert.equal(recovery.reason, 'bootstrap_required');
  });
});

describe('session_start persistence patch', () => {
  it('persists non-null mediation_state, session_memory, runtime_session with v2.3', () => {
    const runtime = createMinimalRuntimeSuccess();
    const patch = buildMediationRuntimePersistencePatch(runtime);

    assert.ok(patch.mediation_state);
    assert.ok(patch.session_memory);
    assert.ok(patch.mediator_runtime_session);
    assert.equal(patch.mediator_engine_version, MEDIATOR_RUNTIME_ENGINE_VERSION);
  });
});

describe('migration 029 participant integrity', () => {
  const sql = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../supabase/migrations/029_mediation_participant_integrity.sql'
    ),
    'utf8'
  );

  it('adds partner_not_host check without rewriting rows', () => {
    assert.match(sql, /mediations_partner_not_host_check/);
    assert.match(sql, /partner_id IS NULL OR partner_id <> user_id/);
    assert.match(sql, /NOT VALID/);
    assert.match(sql, /SELECT id, user_id, partner_id/);
  });
});

describe('load diagnostics expose bootstrap fields', () => {
  it('tracks mediation_state and session_memory presence', () => {
    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role: 'host',
      mediationId: MEDIATION_ID,
      loadAttempted: true,
      rowFound: true,
      rawRuntimeSession: null,
      rawMediationState: createBaselineMediationState(),
      rawSessionMemory: createEmptySessionMemory(),
      supabaseErrorCode: null,
    });

    assert.equal(diagnostics.mediationStatePresent, true);
    assert.equal(diagnostics.sessionMemoryPresent, true);
    assert.equal(diagnostics.runtimeSessionPresent, false);
  });
});
