-- Fix excessive table-level privileges on public.mediation_sessions (V2 runtime).
--
-- Context:
--   Migration 031 granted SELECT and revoked INSERT/UPDATE/DELETE only.
--   PostgreSQL default table grants still left REFERENCES, TRIGGER, and TRUNCATE
--   on anon and authenticated. This migration resets to least privilege.
--
-- Repo audit (migrations 001–031):
--   - No ALTER DEFAULT PRIVILEGES found.
--   - No GRANT ... ON ALL TABLES IN SCHEMA public found.
--   - No global anon/authenticated table grant pattern to mirror.
--   Therefore this migration is scoped exclusively to mediation_sessions;
--   default privileges for future postgres-created tables are NOT changed here.

REVOKE ALL PRIVILEGES ON TABLE public.mediation_sessions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_sessions FROM authenticated;

GRANT SELECT ON TABLE public.mediation_sessions TO authenticated;

-- anon: no grants (RLS + absence of SELECT privilege)
-- service_role: unchanged (inherits superuser/bypass via Supabase platform defaults)
