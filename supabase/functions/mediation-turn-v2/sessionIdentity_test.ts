import { mapRpcErrorMessage } from './errors.ts';
import {
  buildSessionIdentityFromMediation,
  classifyFindSessionLookup,
  differingIdentityFields,
  evaluateCreateIdentityConflict,
  identitiesMatch,
  mayCreateAfterLookup,
  sessionIdentityFromRow,
} from './sessionIdentity.ts';
import { isReadOnlyBootstrapResume, planBootstrapResume } from './bootstrapResume.ts';
import { buildEnvelope } from './envelope.ts';
import type { MediationRow, MediationSessionRow } from './types.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
}

const MEDIATION_ID = '108a4c88-b060-47b1-ac0f-52786b3ec258';
const COUPLE_ID = '3073f044-b1f3-42bd-962c-6fb757887ff2';
const HOST_ID = '627003e6-8782-4600-9d95-34beeaf105a0';
const PARTNER_ID = '7d8d25ae-269f-4d52-b9d3-7df0118d374d';

function sampleMediation(overrides: Partial<MediationRow> = {}): MediationRow {
  return {
    id: MEDIATION_ID,
    couple_id: COUPLE_ID,
    user_id: HOST_ID,
    partner_id: PARTNER_ID,
    conflict_category: 'communication',
    what_happened: null,
    what_angered: null,
    how_felt: null,
    what_needed: null,
    what_to_say: null,
    combined_description: null,
    analysis: null,
    partner_what_happened: null,
    partner_what_angered: null,
    partner_how_felt: null,
    partner_what_needed: null,
    partner_what_to_say: null,
    partner_combined_description: null,
    partner_analysis: null,
    ...overrides,
  };
}

function sampleSession(
  overrides: Partial<MediationSessionRow> = {}
): MediationSessionRow {
  return {
    session_id: '427ba7e7-c0cf-4a84-8096-79ad7fa0ada9',
    mediation_id: MEDIATION_ID,
    couple_id: COUPLE_ID,
    host_user_id: HOST_ID,
    partner_user_id: PARTNER_ID,
    conflict_category: 'communication',
    session_payload: {
      summary: 'Real summary text',
      confirmations: {
        SUMMARY: { HOST: true, PARTNER: false },
        COMPROMISE: { HOST: false, PARTNER: false },
        LESSON: { HOST: false, PARTNER: false },
        DATE: { HOST: false, PARTNER: false },
      },
    },
    session_version: 13,
    current_screen: 'SUMMARY',
    generation_status: 'IDLE',
    last_generation_kind: 'SUMMARY',
    progress_total: 6,
    prompt_version: 'summary-v2-1',
    model_version: 'claude-haiku-4-5-20251001',
    ...overrides,
  };
}

Deno.test('1. identical identity → RETURN_EXISTING (no conflict)', () => {
  const proposed = buildSessionIdentityFromMediation(sampleMediation());
  if ('error' in proposed) throw new Error('expected identity');
  const existing = sessionIdentityFromRow(sampleSession());
  assertEquals(
    evaluateCreateIdentityConflict({ existing, proposed }),
    'RETURN_EXISTING'
  );
});

Deno.test('2. host and partner build identical create identity args', () => {
  const mediation = sampleMediation();
  // Both call paths use the same builder — auth subject is irrelevant.
  const asHostCaller = buildSessionIdentityFromMediation(mediation);
  const asPartnerCaller = buildSessionIdentityFromMediation(mediation);
  assertDeepEqual(asHostCaller, asPartnerCaller);
  if ('error' in asHostCaller) throw new Error('expected identity');
  assertEquals(asHostCaller.hostUserId, HOST_ID);
  assertEquals(asHostCaller.partnerUserId, PARTNER_ID);
  assertEquals(asHostCaller.hostUserId === asHostCaller.partnerUserId, false);
});

Deno.test('3. swapped host/partner → SESSION_IDENTITY_CONFLICT, no reload path', () => {
  const proposed = buildSessionIdentityFromMediation(sampleMediation());
  if ('error' in proposed) throw new Error('expected identity');
  const existing = sessionIdentityFromRow(
    sampleSession({
      host_user_id: PARTNER_ID,
      partner_user_id: HOST_ID,
    })
  );
  assertEquals(
    evaluateCreateIdentityConflict({ existing, proposed }),
    'SESSION_IDENTITY_CONFLICT'
  );
  assertDeepEqual(differingIdentityFields(proposed, existing!), [
    'hostUserId',
    'partnerUserId',
  ]);
});

Deno.test('4. different couple_id → conflict', () => {
  const proposed = buildSessionIdentityFromMediation(sampleMediation());
  if ('error' in proposed) throw new Error('expected identity');
  const existing = sessionIdentityFromRow(
    sampleSession({ couple_id: '00000000-0000-4000-8000-000000000099' })
  );
  assertEquals(
    evaluateCreateIdentityConflict({ existing, proposed }),
    'SESSION_IDENTITY_CONFLICT'
  );
  assertEquals(differingIdentityFields(proposed, existing!)[0], 'coupleId');
});

Deno.test('5. different conflict_category → conflict', () => {
  const proposed = buildSessionIdentityFromMediation(sampleMediation());
  if ('error' in proposed) throw new Error('expected identity');
  const existing = sessionIdentityFromRow(
    sampleSession({ conflict_category: 'money' })
  );
  assertEquals(
    evaluateCreateIdentityConflict({ existing, proposed }),
    'SESSION_IDENTITY_CONFLICT'
  );
  assertEquals(
    differingIdentityFields(proposed, existing!)[0],
    'conflictCategory'
  );
});

Deno.test('6. lookup failure must not be treated as missing session', () => {
  const failed = classifyFindSessionLookup({
    error: { message: 'db down' },
    data: null,
  });
  assertEquals(failed.kind, 'query_failed');
  assertEquals(mayCreateAfterLookup(failed), false);

  const badShape = classifyFindSessionLookup({
    error: null,
    data: { session_id: 123 },
  });
  assertEquals(badShape.kind, 'bad_shape');
  assertEquals(mayCreateAfterLookup(badShape), false);

  const missing = classifyFindSessionLookup({ error: null, data: null });
  assertEquals(missing.kind, 'missing');
  assertEquals(mayCreateAfterLookup(missing), true);

  const found = classifyFindSessionLookup({
    error: null,
    data: { session_id: '427ba7e7-c0cf-4a84-8096-79ad7fa0ada9' },
  });
  assertEquals(found.kind, 'found');
  assertEquals(mayCreateAfterLookup(found), false);
});

Deno.test('7. existing SUMMARY + partner START_OR_RESUME plan → read-only envelope', () => {
  const session = sampleSession();
  assertEquals(planBootstrapResume(session).kind, 'read_envelope');
  assertEquals(isReadOnlyBootstrapResume(session), true);

  const partnerEnvelope = buildEnvelope({
    session,
    talker: 'PARTNER',
    correlationId: '00000000-0000-4000-8000-0000000000aa',
  });
  assertEquals(partnerEnvelope.screen, 'SUMMARY');
  assertEquals(partnerEnvelope.actions[0]?.type, 'CONTINUE');
  assertEquals(partnerEnvelope.actions[0]?.disabled, false);
  assertEquals(partnerEnvelope.content.hostConfirmed, true);
});

Deno.test('8. read-only resume does not change sessionVersion in envelope source', () => {
  const session = sampleSession({ session_version: 13 });
  const before = session.session_version;
  const envelope = buildEnvelope({
    session,
    talker: 'PARTNER',
    correlationId: '00000000-0000-4000-8000-0000000000bb',
  });
  assertEquals(envelope.sessionVersion, before);
  assertEquals(session.session_version, before);
  assertEquals(isReadOnlyBootstrapResume(session), true);
});

Deno.test('SESSION_IDENTITY_CONFLICT maps to its own public code, not INVALID_TRANSITION', () => {
  const mapped = mapRpcErrorMessage(
    'SESSION_IDENTITY_CONFLICT',
    'create_mediation_session'
  );
  assertEquals(mapped.publicCode, 'SESSION_IDENTITY_CONFLICT');
  assertEquals(mapped.httpStatus, 409);
  assertEquals(mapped.publicCode === 'INVALID_TRANSITION', false);
});

Deno.test('identical mediation/session identity matches real case IDs', () => {
  const fromMediation = buildSessionIdentityFromMediation(sampleMediation());
  const fromSession = sessionIdentityFromRow(sampleSession());
  if ('error' in fromMediation || !fromSession) throw new Error('identity');
  assertEquals(identitiesMatch(fromMediation, fromSession), true);
  assertEquals(differingIdentityFields(fromMediation, fromSession).length, 0);
});
