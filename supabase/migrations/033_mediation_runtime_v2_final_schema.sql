-- Mediation Runtime V2 — final tile-flow schema (033).
--
-- Preconditions:
--   - public.mediation_sessions MUST be empty before this migration runs.
--   - Provisional 031 sessions are incompatible with the final tile-flow and are NOT converted.
--   - Legacy live mediations (public.mediations, public.live_messages) remain untouched.
--   - If the provisional table is not empty, migration aborts without modifying any data.
--
-- New V2 sessions are created only after this schema is applied, via future service-role RPCs.
-- Does NOT modify Edge Functions, React Native, or legacy columns on public.mediations.
--
-- Full mediation action RPCs are introduced in the next migration after schema verification.

-- ─── 1. New enums ─────────────────────────────────────────────────────────────

CREATE TYPE public.mediation_screen AS ENUM (
  'SUMMARY',
  'EASY_CHOICES',
  'FIRST_DEAL',
  'COMPROMISE',
  'LESSON',
  'DATE',
  'END'
);

COMMENT ON TYPE public.mediation_screen IS
  'V2 tile flow: current product screen (7 states).';

CREATE TYPE public.mediation_generation_status AS ENUM (
  'IDLE',
  'GENERATING_CONTENT',
  'GENERATING_COMPROMISE',
  'FAILED'
);

COMMENT ON TYPE public.mediation_generation_status IS
  'V2 runtime: in-flight LLM generation state (not a product screen).';

CREATE TYPE public.mediation_generation_kind AS ENUM (
  'SUMMARY_EASY_CHOICES',
  'FIRST_DEAL',
  'COMPROMISE',
  'LESSON_DATE'
);

COMMENT ON TYPE public.mediation_generation_kind IS
  'V2 runtime: kind of the last started or failed LLM generation; supports RETRY.';

CREATE TYPE public.mediation_vote AS ENUM (
  'YES',
  'NO',
  'STUBBORN'
);

COMMENT ON TYPE public.mediation_vote IS
  'V2 runtime: FIRST_DEAL vote values stored in session_payload.firstDealVotes.';

CREATE TYPE public.mediation_agreement_source AS ENUM (
  'FIRST_DEAL',
  'COMPROMISE'
);

COMMENT ON TYPE public.mediation_agreement_source IS
  'V2 runtime: agreement.source validation enum.';

CREATE TYPE public.mediation_agreement_acceptance AS ENUM (
  'ACCEPTED_BY_BOTH',
  'GENERATED_FINAL'
);

COMMENT ON TYPE public.mediation_agreement_acceptance IS
  'V2 runtime: agreement.acceptance validation enum.';

CREATE TYPE public.mediation_content_type AS ENUM (
  'SUMMARY',
  'EASY_CHOICES',
  'FIRST_DEAL',
  'COMPROMISE',
  'LESSON',
  'DATE'
);

COMMENT ON TYPE public.mediation_content_type IS
  'V2 exclusion history bucket content type.';

-- public.mediation_talker (031) is retained for planned commit_* RPCs (Database Contract §9).

-- ─── 2. Default session_payload helper ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mediation_v2_default_session_payload()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'summary', NULL,
    'easyChoices', jsonb_build_object(
      'rounds', '[]'::jsonb,
      'answers', jsonb_build_object(
        'HOST', '{}'::jsonb,
        'PARTNER', '{}'::jsonb
      ),
      'currentRound', 0
    ),
    'firstDeal', NULL,
    'firstDealVotes', jsonb_build_object(
      'HOST', NULL,
      'PARTNER', NULL
    ),
    'compromise', NULL,
    'agreement', NULL,
    'lesson', NULL,
    'date', NULL,
    'confirmations', jsonb_build_object(
      'SUMMARY', jsonb_build_object('HOST', false, 'PARTNER', false),
      'COMPROMISE', jsonb_build_object('HOST', false, 'PARTNER', false),
      'LESSON', jsonb_build_object('HOST', false, 'PARTNER', false),
      'DATE', jsonb_build_object('HOST', false, 'PARTNER', false)
    ),
    'metadata', jsonb_build_object(
      'llmCallCount', 0,
      'lastFailedAt', NULL
    )
  );
$$;

COMMENT ON FUNCTION public.mediation_v2_default_session_payload() IS
  'Returns the empty V2 session_payload template (Database Contract §3.1).';

-- ─── 3. Preflight — provisional table must be empty ───────────────────────────

DO $$
DECLARE
  v_row_count bigint;
BEGIN
  SELECT count(*)
  INTO v_row_count
  FROM public.mediation_sessions;

  IF v_row_count > 0 THEN
    RAISE EXCEPTION
      'MIGRATION_033_NONEMPTY_PROVISIONAL_SESSIONS: public.mediation_sessions contains % row(s) from provisional migration 031, which are incompatible with the final tile-flow V2 schema.',
      v_row_count
      USING
        DETAIL = 'Migration 033 does not convert chat-based provisional sessions to tile-flow session_payload. Legacy runtime data must be reviewed and consciously archived or removed outside this migration before re-running.',
        HINT = 'Inspect provisional rows, export if needed, then remove them through a controlled manual process before applying 033 again.';
  END IF;
END;
$$;

-- ─── 4. Drop legacy RPC (031 chat-turn commit; replaced by tile-flow RPCs in 034) ─

REVOKE ALL ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) FROM service_role;

-- Safe: preflight guarantees no in-flight callers rely on persisted 031 session rows.
DROP FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
);

-- ─── 5. Drop legacy columns, index, and CHECK constraints ─────────────────────

DROP INDEX IF EXISTS public.mediation_sessions_last_request_id_partial_idx;

ALTER TABLE public.mediation_sessions
  DROP CONSTRAINT IF EXISTS mediation_sessions_message_count_non_negative,
  DROP CONSTRAINT IF EXISTS mediation_sessions_chat_history_is_array,
  DROP CONSTRAINT IF EXISTS mediation_sessions_partner_distinct_from_host;

ALTER TABLE public.mediation_sessions
  DROP COLUMN chat_history,
  DROP COLUMN message_count,
  DROP COLUMN current_talker,
  DROP COLUMN current_macro_state,
  DROP COLUMN last_request_id;

-- ─── 6. Drop legacy macro-state enum ───────────────────────────────────────────

-- Safe: current_macro_state column dropped above; commit_mediation_turn dropped above.
DROP TYPE public.mediation_macro_state;

-- mediation_talker retained: planned commit_mediation_action / commit_mediation_vote RPCs (034).

-- ─── 7. Final columns and constraints on mediation_sessions ─────────────────────

ALTER TABLE public.mediation_sessions
  ADD COLUMN couple_id uuid NOT NULL
    REFERENCES public.couples(id) ON DELETE RESTRICT,
  ADD COLUMN conflict_category text NOT NULL,
  ADD COLUMN session_payload jsonb NOT NULL
    DEFAULT public.mediation_v2_default_session_payload(),
  ADD COLUMN session_version integer NOT NULL DEFAULT 0,
  ADD COLUMN current_screen public.mediation_screen NOT NULL DEFAULT 'SUMMARY',
  ADD COLUMN generation_status public.mediation_generation_status NOT NULL DEFAULT 'IDLE',
  ADD COLUMN last_generation_kind public.mediation_generation_kind NULL,
  ADD COLUMN progress_total smallint NOT NULL DEFAULT 6;

ALTER TABLE public.mediation_sessions
  ALTER COLUMN partner_user_id SET NOT NULL;

ALTER TABLE public.mediation_sessions
  DROP CONSTRAINT IF EXISTS mediation_sessions_partner_user_id_fkey;

ALTER TABLE public.mediation_sessions
  ADD CONSTRAINT mediation_sessions_partner_user_id_fkey
    FOREIGN KEY (partner_user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.mediation_sessions
  ADD CONSTRAINT mediation_sessions_session_payload_is_object
    CHECK (jsonb_typeof(session_payload) = 'object'),

  ADD CONSTRAINT mediation_sessions_session_version_non_negative
    CHECK (session_version >= 0),

  ADD CONSTRAINT mediation_sessions_progress_total_valid
    CHECK (progress_total IN (6, 7)),

  ADD CONSTRAINT mediation_sessions_partner_distinct_from_host
    CHECK (host_user_id <> partner_user_id),

  ADD CONSTRAINT mediation_sessions_conflict_category_non_empty
    CHECK (btrim(conflict_category) <> '');

-- ─── 8. New table: mediation_session_idempotency ──────────────────────────────

CREATE TABLE public.mediation_session_idempotency (
  session_id uuid NOT NULL
    REFERENCES public.mediation_sessions(session_id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  response_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mediation_session_idempotency_pkey
    PRIMARY KEY (session_id, request_id),

  CONSTRAINT mediation_session_idempotency_response_payload_is_object
    CHECK (jsonb_typeof(response_payload) = 'object')
);

COMMENT ON TABLE public.mediation_session_idempotency IS
  'V2 API idempotency store: (session_id, request_id) → cached response_payload.';

CREATE INDEX mediation_session_idempotency_created_at_idx
  ON public.mediation_session_idempotency (created_at);

-- ─── 9. New table: used_content_logs ──────────────────────────────────────────

CREATE TABLE public.used_content_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL
    REFERENCES public.couples(id) ON DELETE RESTRICT,
  conflict_category text NOT NULL,
  content_type public.mediation_content_type NOT NULL,
  fingerprint text NOT NULL,
  descriptor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT used_content_logs_conflict_category_non_empty
    CHECK (btrim(conflict_category) <> ''),

  CONSTRAINT used_content_logs_fingerprint_non_empty
    CHECK (btrim(fingerprint) <> ''),

  CONSTRAINT used_content_logs_descriptor_non_empty
    CHECK (btrim(descriptor) <> ''),

  CONSTRAINT used_content_logs_bucket_fingerprint_unique
    UNIQUE (couple_id, conflict_category, content_type, fingerprint)
);

COMMENT ON TABLE public.used_content_logs IS
  'V2 exclusion history: max 50 newest entries per (couple_id, conflict_category, content_type).';

-- ─── 10. Additional indexes on mediation_sessions ─────────────────────────────

CREATE INDEX mediation_sessions_couple_id_idx
  ON public.mediation_sessions (couple_id);

CREATE INDEX mediation_sessions_generation_status_idx
  ON public.mediation_sessions (generation_status);

CREATE INDEX mediation_sessions_current_screen_idx
  ON public.mediation_sessions (current_screen);

CREATE INDEX used_content_logs_bucket_idx
  ON public.used_content_logs (
    couple_id,
    conflict_category,
    content_type,
    created_at DESC
  );

-- ─── 11. append_used_content_log RPC (service_role only) ─────────────────────

CREATE OR REPLACE FUNCTION public.append_used_content_log(
  p_couple_id uuid,
  p_conflict_category text,
  p_content_type public.mediation_content_type,
  p_fingerprint text,
  p_descriptor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conflict_category text;
  v_fingerprint text;
  v_descriptor text;
BEGIN
  IF p_couple_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_COUPLE_ID';
  END IF;

  IF p_conflict_category IS NULL OR btrim(p_conflict_category) = '' THEN
    RAISE EXCEPTION 'INVALID_CONFLICT_CATEGORY';
  END IF;

  IF p_content_type IS NULL THEN
    RAISE EXCEPTION 'INVALID_CONTENT_TYPE';
  END IF;

  IF p_fingerprint IS NULL OR btrim(p_fingerprint) = '' THEN
    RAISE EXCEPTION 'INVALID_FINGERPRINT';
  END IF;

  IF p_descriptor IS NULL OR btrim(p_descriptor) = '' THEN
    RAISE EXCEPTION 'INVALID_DESCRIPTOR';
  END IF;

  v_conflict_category := btrim(p_conflict_category);
  v_fingerprint := btrim(p_fingerprint);
  v_descriptor := btrim(p_descriptor);

  INSERT INTO public.used_content_logs (
    couple_id,
    conflict_category,
    content_type,
    fingerprint,
    descriptor
  )
  VALUES (
    p_couple_id,
    v_conflict_category,
    p_content_type,
    v_fingerprint,
    v_descriptor
  )
  ON CONFLICT ON CONSTRAINT used_content_logs_bucket_fingerprint_unique
  DO NOTHING;

  DELETE FROM public.used_content_logs u
  WHERE u.id IN (
    SELECT ranked.id
    FROM (
      SELECT
        ucl.id,
        row_number() OVER (
          ORDER BY ucl.created_at DESC, ucl.id DESC
        ) AS rn
      FROM public.used_content_logs ucl
      WHERE ucl.couple_id = p_couple_id
        AND ucl.conflict_category = v_conflict_category
        AND ucl.content_type = p_content_type
    ) ranked
    WHERE ranked.rn > 50
  );
END;
$$;

COMMENT ON FUNCTION public.append_used_content_log(
  uuid, text, public.mediation_content_type, text, text
) IS
  'Atomically appends an exclusion log entry and purges bucket to max 50 newest rows. service_role only.';

REVOKE ALL ON FUNCTION public.append_used_content_log(
  uuid, text, public.mediation_content_type, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.append_used_content_log(
  uuid, text, public.mediation_content_type, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.append_used_content_log(
  uuid, text, public.mediation_content_type, text, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.append_used_content_log(
  uuid, text, public.mediation_content_type, text, text
) TO service_role;

-- ─── 12. RLS and privileges — mediation_session_idempotency ───────────────────

ALTER TABLE public.mediation_session_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.mediation_session_idempotency FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_session_idempotency FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_session_idempotency FROM authenticated;

GRANT ALL PRIVILEGES ON TABLE public.mediation_session_idempotency TO service_role;

-- ─── 13. RLS and privileges — used_content_logs ─────────────────────────────────

ALTER TABLE public.used_content_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.used_content_logs FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.used_content_logs FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.used_content_logs FROM authenticated;

GRANT ALL PRIVILEGES ON TABLE public.used_content_logs TO service_role;

-- ─── 14. Reconfirm mediation_sessions least privilege (032-compatible) ──────────

REVOKE ALL PRIVILEGES ON TABLE public.mediation_sessions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_sessions FROM authenticated;

GRANT SELECT ON TABLE public.mediation_sessions TO authenticated;

-- mediation_sessions_set_updated_at trigger (031) retained unchanged.

COMMENT ON TABLE public.mediation_sessions IS
  'V2 tile-flow mediation session. One row per mediation. Mutations via service_role RPC only (next migration).';

COMMENT ON COLUMN public.mediation_sessions.session_payload IS
  'Full V2 session content store (Database Contract §3).';

COMMENT ON COLUMN public.mediation_sessions.session_version IS
  'Optimistic concurrency counter; replaces legacy message_count.';

COMMENT ON COLUMN public.mediation_sessions.current_screen IS
  'Current product screen (mediation_screen enum).';

COMMENT ON COLUMN public.mediation_sessions.generation_status IS
  'In-flight LLM generation state; not a product screen.';

COMMENT ON COLUMN public.mediation_sessions.last_generation_kind IS
  'Kind of the last started or failed LLM generation; used for RETRY routing. Stored as typed column, not in session_payload.';

COMMENT ON COLUMN public.mediation_sessions.progress_total IS
  'Total progress steps: 6 without COMPROMISE path, 7 with COMPROMISE. Set to 7 by backend when entering COMPROMISE branch.';

COMMENT ON COLUMN public.mediation_sessions.couple_id IS
  'Supplied by future create_mediation_session RPC from authorized mediation data; client is not the source of truth.';

COMMENT ON COLUMN public.mediation_sessions.conflict_category IS
  'Set at V2 session creation from intake/pre-live analysis via Edge Function → service-role RPC; client is not the source of truth.';

-- Full mediation action RPCs are introduced in the next migration after schema verification.
