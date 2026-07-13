#!/usr/bin/env node
/**
 * Smoke probe for check-limits Edge Function (no form data, no tokens logged).
 * Usage: node scripts/diagnose-check-limits.mjs [USER_ACCESS_TOKEN]
 */
const SUPABASE_URL = 'https://ilqdxdjnabmbmmstvczh.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWR4ZGpuYWJtYm1tc3R2Y3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODk3MjEsImV4cCI6MjA5NjA2NTcyMX0.yEGoG172ibyvehJCbIs8Cd61mZmvlj8jKR3sIO2efAw';

const body = {
  user_id: '00000000-0000-0000-0000-000000000001',
  action: 'create_live_mediation',
  couple_id: '00000000-0000-0000-0000-000000000002',
};

async function probe(label, bearer) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-limits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  console.log(`\n=== ${label} ===`);
  console.log('HTTP', response.status);
  console.log('Body', text);
}

const userToken = process.argv[2];
await probe('anon bearer (callEdge fallback when session missing)', ANON_KEY);
if (userToken) {
  await probe('user access token', userToken);
} else {
  console.log('\nPass a user access_token as argv[1] to probe authenticated calls.');
}
