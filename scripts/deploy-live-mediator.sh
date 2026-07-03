#!/usr/bin/env bash
# Deploy live-mediator edge function (index.ts + i18n.ts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="ilqdxdjnabmbmmstvczh"
cd "$ROOT"

echo "=== Deploy live-mediator → ${PROJECT_REF} ==="
echo "Function files:"
echo "  supabase/functions/live-mediator/index.ts"
echo "  supabase/functions/live-mediator/i18n.ts"
echo ""

if ! npx supabase projects list >/dev/null 2>&1; then
  echo "Run first: npx supabase login"
  echo "Or: export SUPABASE_ACCESS_TOKEN=..."
  exit 1
fi

npx supabase functions deploy live-mediator --project-ref "$PROJECT_REF"

echo ""
echo "=== Test ==="
bash "$ROOT/scripts/check-live-mediator-edge.sh"
