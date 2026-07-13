import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const MIGRATION_028_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/028_live_messages_couple_participant_rls.sql'
);
const MIGRATION_018_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/018_live_messages_realtime.sql'
);
const MIGRATION_004_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/004_live_messages.sql'
);
const COUPLES_MIGRATION_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/015_couple_read_policies.sql'
);

const sql = readFileSync(MIGRATION_028_PATH, 'utf8');
const realtimeSql = readFileSync(MIGRATION_018_PATH, 'utf8');
const legacySql = readFileSync(MIGRATION_004_PATH, 'utf8');
const couplesSql = readFileSync(COUPLES_MIGRATION_PATH, 'utf8');

function selectPolicyBody(): string {
  const match = sql.match(
    /CREATE POLICY "Participants can view live messages"[\s\S]*?USING \(([\s\S]*?)\);/
  );
  assert.ok(match, 'SELECT policy body missing');
  return match[1];
}

function insertPolicyBody(): string {
  const match = sql.match(
    /CREATE POLICY "Participants can send live messages"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/
  );
  assert.ok(match, 'INSERT policy body missing');
  return match[1];
}

describe('migration 028 live_messages RLS audit', () => {
  it('does not reference live_messages inside couples policies', () => {
    assert.doesNotMatch(couplesSql, /live_messages/i);
  });

  it('policies read mediations and couples only — no live_messages self-reference', () => {
    assert.match(sql, /FROM public\.mediations m/);
    assert.match(sql, /FROM public\.couples c/);
    assert.doesNotMatch(sql, /FROM public\.live_messages/i);
  });

  it('requires fully linked couple (partner_2_id IS NOT NULL)', () => {
    assert.match(sql, /c\.partner_2_id IS NOT NULL/);
  });

  it('scopes couple access to matching couple_id on the mediation row', () => {
    assert.match(sql, /c\.id = m\.couple_id/);
    assert.match(sql, /c\.partner_1_id = auth\.uid\(\) OR c\.partner_2_id = auth\.uid\(\)/);
  });

  it('keeps direct host and partner_id access paths', () => {
    assert.match(sql, /m\.user_id = auth\.uid\(\)/);
    assert.match(sql, /m\.partner_id = auth\.uid\(\)/);
  });
});

describe('migration 028 access scenarios (policy structure)', () => {
  const selectBody = selectPolicyBody();
  const insertBody = insertPolicyBody();

  it('host SELECT — user_id path present in SELECT policy', () => {
    assert.match(selectBody, /m\.user_id = auth\.uid\(\)/);
  });

  it('partner SELECT — partner_id and couple member paths present', () => {
    assert.match(selectBody, /m\.partner_id = auth\.uid\(\)/);
    assert.match(selectBody, /m\.couple_id IS NOT NULL/);
  });

  it('partner INSERT — own sender_id required', () => {
    assert.match(insertBody, /live_messages\.sender_id = auth\.uid\(\)::text/);
  });

  it('partner cannot INSERT as host — no bare sender_id override without auth match', () => {
    assert.doesNotMatch(insertBody, /sender_id\s*=\s*m\.user_id/);
    assert.match(insertBody, /live_messages\.sender_id = auth\.uid\(\)::text/);
  });

  it('partner cannot INSERT AI messages — ai sender restricted to mediation host', () => {
    assert.match(insertBody, /live_messages\.sender_id = 'ai'/);
    assert.match(insertBody, /AND m\.user_id = auth\.uid\(\)/);
  });

  it('AI messages visible to both — public messages allowed when is_private = false', () => {
    assert.match(selectBody, /live_messages\.is_private = false/);
  });

  it('private hints remain scoped to recipient or sender', () => {
    assert.match(selectBody, /live_messages\.recipient_id = auth\.uid\(\)/);
    assert.match(selectBody, /live_messages\.sender_id = auth\.uid\(\)::text/);
  });
});

describe('migration 028 vs legacy 004 regression', () => {
  it('legacy policy lacked couple_id branch — root cause for partner block', () => {
    assert.doesNotMatch(legacySql, /couple_id/);
    assert.doesNotMatch(legacySql, /FROM public\.couples/i);
    assert.match(sql, /m\.couple_id IS NOT NULL/);
  });
});

describe('live_messages realtime publication', () => {
  it('live_messages is in supabase_realtime publication', () => {
    assert.match(realtimeSql, /ADD TABLE public\.live_messages/);
  });
});
