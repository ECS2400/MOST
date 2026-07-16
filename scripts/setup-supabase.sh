#!/usr/bin/env bash
# One-time Supabase CLI setup for MOST (project ilqdxdjnabmbmmstvczh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="ilqdxdjnabmbmmstvczh"
cd "$ROOT"

echo "=== 1/3 supabase init (config.toml) ==="
if [[ -f supabase/config.toml ]]; then
  echo "config.toml already exists — skipping init."
else
  npx supabase init --yes
fi

echo ""
echo "=== 2/3 supabase login ==="
echo "Opens browser. Alternatively: export SUPABASE_ACCESS_TOKEN=... from"
echo "https://supabase.com/dashboard/account/tokens"
if ! npx supabase projects list >/dev/null 2>&1; then
  npx supabase login
fi

echo ""
echo "=== 3/3 supabase link ==="
npx supabase link --project-ref "$PROJECT_REF" --yes

echo ""
echo "Done. Project linked to https://${PROJECT_REF}.supabase.co"
