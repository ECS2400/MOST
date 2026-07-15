-- Runtime V2 cleanup — single source of truth for generation routing.
--
-- last_generation_kind lives on mediation_sessions (column).
-- session_payload.metadata.lastGenerationKind was doc drift only; never in 033 default.
-- Strip it from any existing rows so payload cannot diverge from the column.

UPDATE public.mediation_sessions
SET session_payload = session_payload - 'metadata'
    || jsonb_build_object(
      'metadata',
      (session_payload -> 'metadata') - 'lastGenerationKind'
    )
WHERE session_payload ? 'metadata'
  AND session_payload -> 'metadata' ? 'lastGenerationKind';

COMMENT ON COLUMN public.mediation_sessions.last_generation_kind IS
  'Single source of truth for LLM generation target and RETRY routing. '
  'Not duplicated in session_payload.metadata.';
