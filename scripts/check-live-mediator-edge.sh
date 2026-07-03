#!/usr/bin/env bash
# Test live-mediator edge (OpenAI + funFact).
set -euo pipefail
URL="https://ilqdxdjnabmbmmstvczh.supabase.co/functions/v1/live-mediator"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWR4ZGpuYWJtYm1tc3R2Y3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODk3MjEsImV4cCI6MjA5NjA2NTcyMX0.yEGoG172ibyvehJCbIs8Cd61mZmvlj8jKR3sIO2efAw"

echo "=== live-mediator diagnostics ==="
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"diagnostics":true}' | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== live turn (emocje → funFact?) ==="
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{
    "phase": 1,
    "userId": "test-user",
    "analysisSummary": {
      "situation_summary": "Partner poszedł na imprezę, user został z dzieckiem.",
      "key_trigger": "brak wsparcia gdy było potrzebne",
      "user_emotions": ["złość", "zranienie"]
    },
    "triggerMessage": { "content": "Czuję się zraniony i samotny w tym wszystkim", "senderRole": "user" },
    "recentMessages": [
      { "sender_id": "test-user", "content": "Czuję się zraniony i samotny w tym wszystkim", "message_type": "message" }
    ]
  }' | python3 -m json.tool 2>/dev/null || cat
