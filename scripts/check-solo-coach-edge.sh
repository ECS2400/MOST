#!/usr/bin/env bash
# Sprawdza czy solo-coach widzi OPENAI_API_KEY w chmurze.
# Użycie: ./scripts/check-solo-coach-edge.sh

set -euo pipefail
URL="https://ilqdxdjnabmbmmstvczh.supabase.co/functions/v1/solo-coach"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWR4ZGpuYWJtYm1tc3R2Y3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODk3MjEsImV4cCI6MjA5NjA2NTcyMX0.yEGoG172ibyvehJCbIs8Cd61mZmvlj8jKR3sIO2efAw"

echo "=== solo-coach diagnostics ==="
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"diagnostics":true}' | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== test reply (source) ==="
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"co o tym sądzisz","recentMessages":[{"role":"user","content":"co o tym sądzisz"}],"analysisSummary":{"situation_summary":"impreza vs dziecko"},"chatMode":true}' \
  | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "Jeśli openaiConfigured=false → ustaw secret TUTAJ (NIE w Vault):"
echo "https://supabase.com/dashboard/project/ilqdxdjnabmbmmstvczh/settings/functions"
