import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { parseLoadedMediationRuntimeRow } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import {
  buildRuntimeSessionLoadDiagnostics,
  resolveRuntimeSessionFromRow,
} from '@/services/mediatorRuntimeClient/runtimeSessionLoadDiagnostics';
import {
  liveRuntimeDevStatusLabel,
  resolveLiveRuntimeDevStatus,
  shouldCommitRuntimeSessionRefresh,
  shouldRefreshRuntimeSessionOnSessionPoll,
  shouldRefreshRuntimeSessionOnSilentSync,
} from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import { runtimeAwaitingBothRepliesFixture } from '@/services/mediatorRuntimeClient/__tests__/client/runtimeSessionFixtures';

const MIGRATION_027_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/027_mediation_couple_participant_rls.sql'
);
const COUPLES_MIGRATION_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/015_couple_read_policies.sql'
);

describe('migration 027 RLS audit', () => {
  const sql = readFileSync(MIGRATION_027_PATH, 'utf8');
  const couplesSql = readFileSync(COUPLES_MIGRATION_PATH, 'utf8');

  it('does not reference mediations inside couples policies', () => {
    assert.doesNotMatch(couplesSql, /FROM\s+public\.mediations/i);
  });

  it('couple branch reads couples only — no mediations self-reference', () => {
    assert.match(sql, /FROM public\.couples c/);
    assert.doesNotMatch(sql, /FROM public\.mediations/i);
  });

  it('requires fully linked couple (partner_2_id IS NOT NULL)', () => {
    assert.match(sql, /c\.partner_2_id IS NOT NULL/);
  });

  it('scopes access to the row couple_id matching the couples row', () => {
    assert.match(sql, /c\.id = mediations\.couple_id/);
    assert.match(sql, /c\.partner_1_id = auth\.uid\(\) OR c\.partner_2_id = auth\.uid\(\)/);
  });

  it('keeps direct host and partner_id access paths', () => {
    assert.match(sql, /auth\.uid\(\) = user_id/);
    assert.match(sql, /auth\.uid\(\) = partner_id/);
  });
});

describe('host and partner read the same persisted runtimeSession', () => {
  const runtimeSession = runtimeAwaitingBothRepliesFixture();
  const row = {
    mediation_state: null,
    session_memory: null,
    mediator_runtime_session: runtimeSession,
  };

  it('parses identical contract for host and partner reload paths', () => {
    const hostParsed = parseLoadedMediationRuntimeRow(row);
    const partnerParsed = parseLoadedMediationRuntimeRow(row);

    assert.equal(hostParsed.runtimeSession?.decision.nextBeat, 'await_user_action');
    assert.equal(partnerParsed.runtimeSession?.decision.nextBeat, 'await_user_action');
    assert.equal(hostParsed.runtimeSession?.pending.awaiting, 'both_replies');
    assert.equal(partnerParsed.runtimeSession?.pending.awaiting, 'both_replies');
    assert.deepEqual(hostParsed.runtimeSession, partnerParsed.runtimeSession);
  });

  it('partner reload diagnostics show shapeValid when row exists', () => {
    const diagnostics = buildRuntimeSessionLoadDiagnostics({
      role: 'partner',
      mediationId: 'med-1',
      loadAttempted: true,
      rowFound: true,
      rawRuntimeSession: runtimeSession,
      supabaseErrorCode: null,
    });

    assert.equal(diagnostics.shapeValid, true);
    assert.equal(resolveRuntimeSessionFromRow(runtimeSession)?.session.currentGoal, 'SAFE_OPENING');
  });
});

describe('shouldCommitRuntimeSessionRefresh', () => {
  it('commits only the latest request for the active mediation', () => {
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
  });

  it('rejects stale responses after mediation change', () => {
    assert.equal(
      shouldCommitRuntimeSessionRefresh({
        requestId: 3,
        latestRequestId: 3,
        mounted: true,
        activeMediationId: 'med-old',
        currentMediationId: 'med-new',
      }),
      false
    );
  });

  it('rejects commits after unmount', () => {
    assert.equal(
      shouldCommitRuntimeSessionRefresh({
        requestId: 1,
        latestRequestId: 1,
        mounted: false,
        activeMediationId: 'med-1',
        currentMediationId: 'med-1',
      }),
      false
    );
  });
});

describe('polling and silent sync refresh policy', () => {
  it('does not refresh runtime on every 2s poll tick', () => {
    assert.equal(shouldRefreshRuntimeSessionOnSessionPoll(10, 10), false);
    assert.equal(shouldRefreshRuntimeSessionOnSessionPoll(null, 10), false);
  });

  it('refreshes runtime when live_progress changes', () => {
    assert.equal(shouldRefreshRuntimeSessionOnSessionPoll(10, 25), true);
  });

  it('silent sync without new messages does not refresh runtime', () => {
    assert.equal(shouldRefreshRuntimeSessionOnSilentSync(false), false);
  });

  it('silent sync with new messages refreshes runtime', () => {
    assert.equal(shouldRefreshRuntimeSessionOnSilentSync(true), true);
  });
});

describe('resolveLiveRuntimeDevStatus', () => {
  it('null session is unavailable, not Runtime OK', () => {
    assert.equal(
      liveRuntimeDevStatusLabel(
        resolveLiveRuntimeDevStatus({ runtimeFailed: false, hasValidRuntimeSession: false })
      ),
      'Runtime Unavailable'
    );
  });

  it('invalid shape is unavailable, not Runtime OK', () => {
    assert.equal(
      resolveLiveRuntimeDevStatus({ runtimeFailed: false, hasValidRuntimeSession: false }),
      'unavailable'
    );
  });

  it('valid session shows Runtime OK', () => {
    assert.equal(
      liveRuntimeDevStatusLabel(
        resolveLiveRuntimeDevStatus({ runtimeFailed: false, hasValidRuntimeSession: true })
      ),
      'Runtime OK'
    );
  });

  it('runtimeFailed takes precedence', () => {
    assert.equal(
      resolveLiveRuntimeDevStatus({ runtimeFailed: true, hasValidRuntimeSession: true }),
      'failed'
    );
  });
});

describe('runtime refresh does not trigger applyAiTurn', () => {
  it('refresh guard module has no mediator generation imports', () => {
    const guardPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../runtimeSessionRefreshGuard.ts'
    );
    const source = readFileSync(guardPath, 'utf8');
    assert.doesNotMatch(source, /applyAiTurn/);
    assert.doesNotMatch(source, /processMediationTurn/);
    assert.doesNotMatch(source, /runGenerateNextQuestion/);
  });
});
