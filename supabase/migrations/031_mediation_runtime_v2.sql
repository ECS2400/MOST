-- Mediation Runtime V2 — simplified session store (additive, legacy-safe).
--
-- Scope boundary:
--   - NEW objects only: enums, mediation_sessions, commit_mediation_turn RPC.
--   - Does NOT modify public.mediations, public.live_messages, or legacy v2.3 JSONB columns.
--   - Client writes are blocked; turns are committed exclusively via service_role RPC (Edge Function).
--   - PAYWALL macro state cannot be set through commit_mediation_turn (server-side only).

-- ─── 1. Talker enum ───────────────────────────────────────────────────────────

CREATE TYPE public.mediation_talker AS ENUM (
  'HOST',
  'PARTNER'
);

COMMENT ON TYPE public.mediation_talker IS
  'V2 runtime: which participant is expected to speak next.';

-- ─── 2. Macro state enum ──────────────────────────────────────────────────────

CREATE TYPE public.mediation_macro_state AS ENUM (
  'START_CHAT',
  'GATHER_INFO',
  'PROPOSE_DEAL',
  'PAYWALL'
);

COMMENT ON TYPE public.mediation_macro_state IS
  'V2 runtime: coarse session phase. PAYWALL is set server-side only, not via commit_mediation_turn.';

-- ─── 3. Sessions table ────────────────────────────────────────────────────────

CREATE TABLE public.mediation_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id uuid NOT NULL REFERENCES public.mediations(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  current_talker public.mediation_talker NOT NULL DEFAULT 'HOST',
  current_macro_state public.mediation_macro_state NOT NULL DEFAULT 'START_CHAT',
  last_request_id uuid NULL,
  prompt_version text NOT NULL DEFAULT 'most-v2',
  model_version text NOT NULL DEFAULT 'claude-haiku-4-5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mediation_sessions_message_count_non_negative
    CHECK (message_count >= 0),

  CONSTRAINT mediation_sessions_chat_history_is_array
    CHECK (jsonb_typeof(chat_history) = 'array'),

  CONSTRAINT mediation_sessions_partner_distinct_from_host
    CHECK (partner_user_id IS NULL OR partner_user_id <> host_user_id),

  CONSTRAINT mediation_sessions_mediation_id_unique
    UNIQUE (mediation_id)
);

COMMENT ON TABLE public.mediation_sessions IS
  'V2 simplified mediation runtime session. One row per mediation. Mutations via service_role RPC only.';

COMMENT ON COLUMN public.mediation_sessions.chat_history IS
  'Append-only JSON array of turn messages (user + mediator pairs).';

COMMENT ON COLUMN public.mediation_sessions.message_count IS
  'Number of committed turns (incremented by 1 per commit_mediation_turn call).';

COMMENT ON COLUMN public.mediation_sessions.last_request_id IS
  'Idempotency key for the last successful turn commit.';

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX mediation_sessions_host_user_id_idx
  ON public.mediation_sessions (host_user_id);

CREATE INDEX mediation_sessions_partner_user_id_idx
  ON public.mediation_sessions (partner_user_id);

CREATE INDEX mediation_sessions_updated_at_desc_idx
  ON public.mediation_sessions (updated_at DESC);

CREATE INDEX mediation_sessions_last_request_id_partial_idx
  ON public.mediation_sessions (session_id, last_request_id)
  WHERE last_request_id IS NOT NULL;

-- ─── 5. updated_at trigger (session-local, no shared helper) ───────────────────

CREATE OR REPLACE FUNCTION public.set_mediation_session_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_mediation_session_updated_at() IS
  'Sets updated_at on mediation_sessions BEFORE UPDATE. No mediation business logic.';

CREATE TRIGGER mediation_sessions_set_updated_at
  BEFORE UPDATE ON public.mediation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_mediation_session_updated_at();

-- ─── 6. RLS — read-only for participants ──────────────────────────────────────

ALTER TABLE public.mediation_sessions ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.mediation_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.mediation_sessions FROM authenticated;

GRANT SELECT ON public.mediation_sessions TO authenticated;

CREATE POLICY "Participants can view own mediation session"
  ON public.mediation_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = host_user_id
    OR auth.uid() = partner_user_id
  );

-- ─── 7. Turn commit RPC (service_role only) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.commit_mediation_turn(
  p_session_id uuid,
  p_request_id uuid,
  p_expected_message_count integer,
  p_user_message jsonb,
  p_mediator_message jsonb,
  p_next_talker public.mediation_talker,
  p_next_macro_state public.mediation_macro_state,
  p_prompt_version text,
  p_model_version text
)
RETURNS public.mediation_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.mediation_sessions%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_expected_message_count IS NULL OR p_expected_message_count < 0 THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_MESSAGE_COUNT';
  END IF;

  IF p_next_talker IS NULL THEN
    RAISE EXCEPTION 'INVALID_NEXT_TALKER';
  END IF;

  IF p_next_macro_state IS NULL THEN
    RAISE EXCEPTION 'INVALID_NEXT_MACRO_STATE';
  END IF;

  IF p_prompt_version IS NULL OR btrim(p_prompt_version) = '' THEN
    RAISE EXCEPTION 'INVALID_PROMPT_VERSION';
  END IF;

  IF p_model_version IS NULL OR btrim(p_model_version) = '' THEN
    RAISE EXCEPTION 'INVALID_MODEL_VERSION';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  IF v_session.last_request_id = p_request_id THEN
    RETURN v_session;
  END IF;

  IF v_session.current_macro_state = 'PAYWALL'::public.mediation_macro_state THEN
    RAISE EXCEPTION 'SESSION_PAYWALL_LOCKED';
  END IF;

  IF v_session.message_count <> p_expected_message_count THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF jsonb_typeof(p_user_message) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_USER_MESSAGE';
  END IF;

  IF jsonb_typeof(p_mediator_message) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_MEDIATOR_MESSAGE';
  END IF;

  IF p_next_macro_state = 'PAYWALL'::public.mediation_macro_state THEN
    RAISE EXCEPTION 'PAYWALL_NOT_ALLOWED_VIA_RPC';
  END IF;

  UPDATE public.mediation_sessions
  SET
    chat_history = chat_history || jsonb_build_array(p_user_message, p_mediator_message),
    message_count = message_count + 1,
    current_talker = p_next_talker,
    current_macro_state = p_next_macro_state,
    last_request_id = p_request_id,
    prompt_version = btrim(p_prompt_version),
    model_version = btrim(p_model_version)
  WHERE session_id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) IS
  'Atomically commits one mediation turn (user + mediator messages). Idempotent on p_request_id. Callable by service_role only.';

-- ─── 8. RPC permissions ───────────────────────────────────────────────────────

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

GRANT EXECUTE ON FUNCTION public.commit_mediation_turn(
  uuid, uuid, integer, jsonb, jsonb,
  public.mediation_talker, public.mediation_macro_state, text, text
) TO service_role;
