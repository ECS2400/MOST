-- Mediation Runtime V2 — core RPCs (create, load, generic commit).
--
-- These RPCs provide only atomic session creation, loading and generic state commit.
-- Product transition validation is implemented in the next layer.
--
-- Scope:
--   - create_mediation_session
--   - load_mediation_session
--   - commit_mediation_action (minimal atomic row mutation helper)
-- Does NOT implement LLM, commit_generation, finish_session, or full screen flow.

-- ─── 1. create_mediation_session ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_mediation_session(
  p_mediation_id uuid,
  p_couple_id uuid,
  p_host_user_id uuid,
  p_partner_user_id uuid,
  p_conflict_category text,
  p_prompt_version text,
  p_model_version text,
  p_request_id uuid
)
RETURNS public.mediation_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conflict_category text;
  v_prompt_version text;
  v_model_version text;
  v_mediation_couple_id uuid;
  v_session public.mediation_sessions%ROWTYPE;
BEGIN
  IF p_mediation_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_MEDIATION_ID';
  END IF;

  IF p_couple_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_COUPLE_ID';
  END IF;

  IF p_host_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_HOST_USER_ID';
  END IF;

  IF p_partner_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PARTNER_USER_ID';
  END IF;

  IF p_host_user_id = p_partner_user_id THEN
    RAISE EXCEPTION 'HOST_PARTNER_MUST_DIFFER';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_conflict_category IS NULL OR btrim(p_conflict_category) = '' THEN
    RAISE EXCEPTION 'INVALID_CONFLICT_CATEGORY';
  END IF;

  IF p_prompt_version IS NULL OR btrim(p_prompt_version) = '' THEN
    RAISE EXCEPTION 'INVALID_PROMPT_VERSION';
  END IF;

  IF p_model_version IS NULL OR btrim(p_model_version) = '' THEN
    RAISE EXCEPTION 'INVALID_MODEL_VERSION';
  END IF;

  v_conflict_category := btrim(p_conflict_category);
  v_prompt_version := btrim(p_prompt_version);
  v_model_version := btrim(p_model_version);

  IF NOT EXISTS (
    SELECT 1
    FROM public.mediations m
    WHERE m.id = p_mediation_id
  ) THEN
    RAISE EXCEPTION 'MEDIATION_NOT_FOUND';
  END IF;

  SELECT m.couple_id
  INTO v_mediation_couple_id
  FROM public.mediations m
  WHERE m.id = p_mediation_id;

  IF v_mediation_couple_id IS DISTINCT FROM p_couple_id THEN
    RAISE EXCEPTION 'MEDIATION_COUPLE_MISMATCH';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.couples c
    WHERE c.id = p_couple_id
  ) THEN
    RAISE EXCEPTION 'COUPLE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_host_user_id
  ) THEN
    RAISE EXCEPTION 'HOST_PROFILE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_partner_user_id
  ) THEN
    RAISE EXCEPTION 'PARTNER_PROFILE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.couples c
    WHERE c.id = p_couple_id
      AND c.partner_2_id IS NOT NULL
      AND (
        (c.partner_1_id = p_host_user_id AND c.partner_2_id = p_partner_user_id)
        OR (c.partner_1_id = p_partner_user_id AND c.partner_2_id = p_host_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'COUPLE_MEMBERSHIP_MISMATCH';
  END IF;

  INSERT INTO public.mediation_sessions (
    mediation_id,
    couple_id,
    host_user_id,
    partner_user_id,
    conflict_category,
    session_payload,
    session_version,
    current_screen,
    generation_status,
    last_generation_kind,
    progress_total,
    prompt_version,
    model_version
  )
  VALUES (
    p_mediation_id,
    p_couple_id,
    p_host_user_id,
    p_partner_user_id,
    v_conflict_category,
    public.mediation_v2_default_session_payload(),
    1,
    'SUMMARY'::public.mediation_screen,
    'GENERATING_CONTENT'::public.mediation_generation_status,
    'SUMMARY_EASY_CHOICES'::public.mediation_generation_kind,
    6,
    v_prompt_version,
    v_model_version
  )
  ON CONFLICT (mediation_id) DO NOTHING
  RETURNING * INTO v_session;

  IF FOUND THEN
    INSERT INTO public.mediation_session_idempotency (
      session_id,
      request_id,
      response_payload
    )
    VALUES (
      v_session.session_id,
      p_request_id,
      jsonb_build_object(
        'sessionId', v_session.session_id,
        'sessionVersion', v_session.session_version,
        'status', 'CREATED'
      )
    )
    ON CONFLICT ON CONSTRAINT mediation_session_idempotency_pkey
    DO NOTHING;

    RETURN v_session;
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.mediation_id = p_mediation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_CREATE_RACE_RETRY';
  END IF;

  IF v_session.couple_id IS DISTINCT FROM p_couple_id
     OR v_session.host_user_id IS DISTINCT FROM p_host_user_id
     OR v_session.partner_user_id IS DISTINCT FROM p_partner_user_id
     OR v_session.conflict_category IS DISTINCT FROM v_conflict_category THEN
    RAISE EXCEPTION 'SESSION_IDENTITY_CONFLICT';
  END IF;

  INSERT INTO public.mediation_session_idempotency (
    session_id,
    request_id,
    response_payload
  )
  VALUES (
    v_session.session_id,
    p_request_id,
    jsonb_build_object(
      'sessionId', v_session.session_id,
      'sessionVersion', v_session.session_version,
      'status', 'CREATED'
    )
  )
  ON CONFLICT ON CONSTRAINT mediation_session_idempotency_pkey
  DO NOTHING;

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
) IS
  'Creates a V2 mediation session or returns an existing one when identity matches. Concurrency-safe via ON CONFLICT (mediation_id). service_role only.';

-- ─── 2. load_mediation_session ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.load_mediation_session(
  p_session_id uuid
)
RETURNS public.mediation_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.mediation_sessions%ROWTYPE;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.load_mediation_session(uuid) IS
  'Read-only load of a V2 mediation session row. service_role only.';

-- ─── 3. commit_mediation_action ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.commit_mediation_action(
  p_session_id uuid,
  p_request_id uuid,
  p_expected_session_version integer,
  p_expected_screen public.mediation_screen,
  p_next_screen public.mediation_screen,
  p_session_payload jsonb,
  p_generation_status public.mediation_generation_status,
  p_last_generation_kind public.mediation_generation_kind,
  p_progress_total smallint,
  p_response_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.mediation_sessions%ROWTYPE;
  v_replayed_response jsonb;
  v_inserted_response jsonb;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_expected_session_version IS NULL OR p_expected_session_version < 0 THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_SESSION_VERSION';
  END IF;

  IF p_expected_screen IS NULL THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_SCREEN';
  END IF;

  IF p_next_screen IS NULL THEN
    RAISE EXCEPTION 'INVALID_NEXT_SCREEN';
  END IF;

  IF p_session_payload IS NULL OR jsonb_typeof(p_session_payload) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_SESSION_PAYLOAD';
  END IF;

  IF p_generation_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_GENERATION_STATUS';
  END IF;

  IF p_progress_total IS NULL OR p_progress_total NOT IN (6, 7) THEN
    RAISE EXCEPTION 'INVALID_PROGRESS_TOTAL';
  END IF;

  IF p_response_payload IS NULL OR jsonb_typeof(p_response_payload) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_RESPONSE_PAYLOAD';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  SELECT mi.response_payload
  INTO v_replayed_response
  FROM public.mediation_session_idempotency mi
  WHERE mi.session_id = p_session_id
    AND mi.request_id = p_request_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'replayed', true,
      'session', NULL,
      'response', v_replayed_response
    );
  END IF;

  IF v_session.session_version <> p_expected_session_version THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF v_session.current_screen IS DISTINCT FROM p_expected_screen THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- Reserve requestId before mutating the session row. Both steps share one transaction:
  -- if UPDATE or the function fails afterward, the idempotency INSERT rolls back automatically.
  -- Replay can never occur after a session mutation.
  INSERT INTO public.mediation_session_idempotency (
    session_id,
    request_id,
    response_payload
  )
  VALUES (
    p_session_id,
    p_request_id,
    p_response_payload
  )
  ON CONFLICT ON CONSTRAINT mediation_session_idempotency_pkey
  DO NOTHING
  RETURNING response_payload INTO v_inserted_response;

  IF NOT FOUND THEN
    SELECT mi.response_payload
    INTO v_replayed_response
    FROM public.mediation_session_idempotency mi
    WHERE mi.session_id = p_session_id
      AND mi.request_id = p_request_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'IDEMPOTENCY_RECORD_MISSING';
    END IF;

    RETURN jsonb_build_object(
      'replayed', true,
      'session', NULL,
      'response', v_replayed_response
    );
  END IF;

  UPDATE public.mediation_sessions
  SET
    session_payload = p_session_payload,
    current_screen = p_next_screen,
    generation_status = p_generation_status,
    last_generation_kind = p_last_generation_kind,
    progress_total = p_progress_total,
    session_version = session_version + 1
  WHERE session_id = p_session_id
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'replayed', false,
    'session', to_jsonb(v_session),
    'response', p_response_payload
  );
END;
$$;

COMMENT ON FUNCTION public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) IS
  'Minimal atomic session row commit helper. Returns JSONB envelope {replayed, session, response}; exact replay response comes from mediation_session_idempotency. service_role only.';

-- ─── 4. Permissions — create_mediation_session ───────────────────────────────────

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
) FROM anon;

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
) TO service_role;

-- ─── 5. Permissions — load_mediation_session ───────────────────────────────────

REVOKE ALL ON FUNCTION public.load_mediation_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.load_mediation_session(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.load_mediation_session(uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.load_mediation_session(uuid) TO service_role;

-- ─── 6. Permissions — commit_mediation_action ──────────────────────────────────

REVOKE ALL ON FUNCTION public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM anon;

REVOKE ALL ON FUNCTION public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) TO service_role;
