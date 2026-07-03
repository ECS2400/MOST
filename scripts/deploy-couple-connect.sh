#!/usr/bin/env bash
# Wdraża łączenie par: migracja SQL + funkcja Edge connect-couple.
# Wymaga: supabase login (npx supabase login)

set -euo pipefail

PROJECT_REF="ilqdxdjnabmbmmstvczh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1/2 Migracja SQL (connect_couple_by_invite_code) ==="
echo "Jeśli db push nie działa, wklej plik w SQL Editor:"
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "Plik: supabase/migrations/013_couple_connect_rpc.sql"
echo ""

if npx supabase db push --linked --yes 2>/dev/null; then
  echo "Migracja zastosowana przez db push."
else
  echo "db push wymaga: npx supabase login && npx supabase link --project-ref ${PROJECT_REF}"
  echo "Albo ręcznie uruchom SQL z pliku powyżej w dashboardzie."
fi

echo ""
echo "=== 2/2 Edge Function connect-couple (fallback) ==="
if npx supabase functions deploy connect-couple --project-ref "${PROJECT_REF}"; then
  echo "Funkcja connect-couple wdrożona."
else
  echo "Deploy wymaga: npx supabase login"
  echo "Albo wklej kod z supabase/functions/connect-couple/index.ts w dashboardzie Functions."
fi

echo ""
echo "=== Test RPC ==="
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWR4ZGpuYWJtYm1tc3R2Y3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODk3MjEsImV4cCI6MjA5NjA2NTcyMX0.yEGoG172ibyvehJCbIs8Cd61mZmvlj8jKR3sIO2efAw"
curl -s -X POST "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/connect_couple_by_invite_code" \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Content-Type: application/json" \
  -d '{"p_code":"TEST00"}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "Oczekiwany błąd po wdrożeniu: NOT_AUTHENTICATED lub INVALID_CODE (nie PGRST202)."
