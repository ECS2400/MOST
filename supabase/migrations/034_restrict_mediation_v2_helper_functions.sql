-- Restrict EXECUTE on V2 internal helper functions to least privilege.
--
-- Both functions are internal V2 helpers:
--   - mediation_v2_default_session_payload() — empty session_payload template (033)
--   - set_mediation_session_updated_at()   — BEFORE UPDATE trigger body (031)
--
-- The updated_at trigger continues to work as part of table operations (owned by postgres).
-- Clients (anon, authenticated) do not need direct EXECUTE on these helpers.
-- This migration restores least privilege after default PostgreSQL/Supabase grants to PUBLIC.

-- ─── public.mediation_v2_default_session_payload() ─────────────────────────────

REVOKE ALL ON FUNCTION public.mediation_v2_default_session_payload() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mediation_v2_default_session_payload() FROM anon;
REVOKE ALL ON FUNCTION public.mediation_v2_default_session_payload() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.mediation_v2_default_session_payload() TO service_role;

-- ─── public.set_mediation_session_updated_at() ─────────────────────────────────

REVOKE ALL ON FUNCTION public.set_mediation_session_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_mediation_session_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_mediation_session_updated_at() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.set_mediation_session_updated_at() TO service_role;
