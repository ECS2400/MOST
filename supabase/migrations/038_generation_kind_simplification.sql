-- Mediation Runtime V2 — Generation kind simplification:
--   One screen = one generation_kind = one Claude call.
--
-- Replaces enum values:
--   SUMMARY_EASY_CHOICES → SUMMARY (+ separate EASY_CHOICES)
--   LESSON_DATE         → LESSON  (+ separate DATE)
--
-- Also: llmCallCount is number of STARTED Claude calls (incremented only on
-- outcome CLAIMED, including reclaim). Hard max = 6 (COMPROMISE path).
--
-- Does NOT change claim / lease / concurrency / finalize / fail architecture (037).
-- Does NOT modify migration 037.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Preflight — refuse lossy mapping of in-flight / failed composite kinds
-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY_EASY_CHOICES → SUMMARY and LESSON_DATE → LESSON drop the second
-- screen from the generation target. Active GENERATING_* / FAILED rows or
-- IN_PROGRESS / FAILED claims with those kinds would lose RETRY semantics.

DO $$
DECLARE
  v_session_count bigint;
  v_claim_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO v_session_count
  FROM public.mediation_sessions ms
  WHERE ms.last_generation_kind::text IN ('SUMMARY_EASY_CHOICES', 'LESSON_DATE')
    AND ms.generation_status::text IN (
      'GENERATING_CONTENT',
      'GENERATING_COMPROMISE',
      'FAILED'
    );

  IF v_session_count > 0 THEN
    RAISE EXCEPTION
      '038_PREFLIGHT_ACTIVE_COMPOSITE_GENERATION: % session(s) have last_generation_kind in (SUMMARY_EASY_CHOICES, LESSON_DATE) with generation_status in (GENERATING_*, FAILED). Mapping would lose the dual-screen generation target (EASY_CHOICES or DATE) for RETRY / reclaim. Clear or complete those sessions before applying 038.',
      v_session_count;
  END IF;

  SELECT COUNT(*)
  INTO v_claim_count
  FROM public.mediation_generation_claims c
  WHERE c.generation_kind::text IN ('SUMMARY_EASY_CHOICES', 'LESSON_DATE')
    AND c.status::text IN ('IN_PROGRESS', 'FAILED');

  IF v_claim_count > 0 THEN
    RAISE EXCEPTION
      '038_PREFLIGHT_ACTIVE_COMPOSITE_CLAIM: % claim(s) have generation_kind in (SUMMARY_EASY_CHOICES, LESSON_DATE) with status in (IN_PROGRESS, FAILED). Mapping would retarget claims to SUMMARY or LESSON only. Clear or complete those claims before applying 038.',
      v_claim_count;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. New enum
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE public.mediation_generation_kind_new AS ENUM (
  'SUMMARY',
  'EASY_CHOICES',
  'FIRST_DEAL',
  'COMPROMISE',
  'LESSON',
  'DATE'
);

COMMENT ON TYPE public.mediation_generation_kind_new IS
  'V2 runtime: one generation kind per product screen. Supports RETRY.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Drop RPCs that bind the old enum in their signatures
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
);

DROP FUNCTION IF EXISTS public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
);

DROP FUNCTION IF EXISTS public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
);

DROP FUNCTION IF EXISTS public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
);

DROP FUNCTION IF EXISTS public.commit_mediation_action(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Migrate columns → new enum
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.mediation_sessions
  ALTER COLUMN last_generation_kind TYPE public.mediation_generation_kind_new
  USING (
    CASE last_generation_kind::text
      WHEN 'SUMMARY_EASY_CHOICES' THEN 'SUMMARY'::public.mediation_generation_kind_new
      WHEN 'LESSON_DATE' THEN 'LESSON'::public.mediation_generation_kind_new
      WHEN 'FIRST_DEAL' THEN 'FIRST_DEAL'::public.mediation_generation_kind_new
      WHEN 'COMPROMISE' THEN 'COMPROMISE'::public.mediation_generation_kind_new
      ELSE NULL
    END
  );

ALTER TABLE public.mediation_generation_claims
  ALTER COLUMN generation_kind TYPE public.mediation_generation_kind_new
  USING (
    CASE generation_kind::text
      WHEN 'SUMMARY_EASY_CHOICES' THEN 'SUMMARY'::public.mediation_generation_kind_new
      WHEN 'LESSON_DATE' THEN 'LESSON'::public.mediation_generation_kind_new
      WHEN 'FIRST_DEAL' THEN 'FIRST_DEAL'::public.mediation_generation_kind_new
      WHEN 'COMPROMISE' THEN 'COMPROMISE'::public.mediation_generation_kind_new
      ELSE 'SUMMARY'::public.mediation_generation_kind_new
    END
  );

DROP TYPE public.mediation_generation_kind;

ALTER TYPE public.mediation_generation_kind_new
  RENAME TO mediation_generation_kind;

COMMENT ON TYPE public.mediation_generation_kind IS
  'V2 runtime: one generation kind per product screen '
  '(SUMMARY | EASY_CHOICES | FIRST_DEAL | COMPROMISE | LESSON | DATE). Supports RETRY.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. create_mediation_session — last_generation_kind = SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_mediation_session(
  p_mediation_id uuid,
  p_couple_id uuid,
  p_host_user_id uuid,
  p_partner_user_id uuid,
  p_conflict_category text,
  p_prompt_version text,
  p_model_version text
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
    'SUMMARY'::public.mediation_generation_kind,
    6,
    v_prompt_version,
    v_model_version
  )
  ON CONFLICT (mediation_id) DO NOTHING
  RETURNING * INTO v_session;

  IF FOUND THEN
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

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
) IS
  'Creates a V2 mediation session or returns an existing one when identity matches. '
  'Starts at SUMMARY / GENERATING_CONTENT / last_generation_kind=SUMMARY. '
  'Does not write mediation_session_idempotency. service_role only.';

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
) FROM anon;

REVOKE ALL ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text
) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. claim_mediation_generation — guards for SUMMARY + EASY_CHOICES
--    (lease / concurrency / outcomes unchanged from 037)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.claim_mediation_generation(
  p_session_id uuid,
  p_request_id uuid,
  p_generation_kind public.mediation_generation_kind,
  p_expected_session_version integer,
  p_expected_screen public.mediation_screen,
  p_expected_generation_status public.mediation_generation_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease interval := interval '5 minutes';
  v_now timestamptz := clock_timestamp();
  v_session public.mediation_sessions%ROWTYPE;
  v_own public.mediation_generation_claims%ROWTYPE;
  v_active public.mediation_generation_claims%ROWTYPE;
  v_summary_json jsonb;
  v_rounds_json jsonb;
  v_new_token uuid;
  v_lease_expires timestamptz;
  v_llm_call_count integer;
  v_payload jsonb;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_generation_kind IS NULL THEN
    RAISE EXCEPTION 'INVALID_GENERATION_KIND';
  END IF;

  IF p_expected_session_version IS NULL OR p_expected_session_version < 0 THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_SESSION_VERSION';
  END IF;

  IF p_expected_screen IS NULL THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_SCREEN';
  END IF;

  IF p_expected_generation_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_EXPECTED_GENERATION_STATUS';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  IF v_session.session_version <> p_expected_session_version THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF v_session.current_screen IS DISTINCT FROM p_expected_screen THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF v_session.generation_status IS DISTINCT FROM p_expected_generation_status THEN
    RAISE EXCEPTION 'INVALID_GENERATION_STATUS';
  END IF;

  IF v_session.last_generation_kind IS DISTINCT FROM p_generation_kind THEN
    RAISE EXCEPTION 'INVALID_GENERATION_KIND';
  END IF;

  -- One screen / one kind: require empty target content before claim.
  IF p_generation_kind = 'SUMMARY'::public.mediation_generation_kind THEN
    v_summary_json := v_session.session_payload -> 'summary';
    IF v_summary_json IS NOT NULL
       AND jsonb_typeof(v_summary_json) = 'string'
       AND btrim(v_summary_json #>> '{}') <> '' THEN
      RAISE EXCEPTION 'SUMMARY_ALREADY_PRESENT';
    END IF;
  END IF;

  IF p_generation_kind = 'EASY_CHOICES'::public.mediation_generation_kind THEN
    v_rounds_json := v_session.session_payload -> 'easyChoices' -> 'rounds';
    IF v_rounds_json IS NOT NULL
       AND jsonb_typeof(v_rounds_json) = 'array'
       AND jsonb_array_length(v_rounds_json) > 0 THEN
      RAISE EXCEPTION 'EASY_CHOICES_ALREADY_PRESENT';
    END IF;
  END IF;

  SELECT *
  INTO v_own
  FROM public.mediation_generation_claims c
  WHERE c.session_id = p_session_id
    AND c.request_id = p_request_id
    AND c.generation_kind = p_generation_kind
  FOR UPDATE;

  IF FOUND THEN
    IF v_own.status = 'SUCCEEDED'::public.mediation_generation_claim_status THEN
      RETURN jsonb_build_object(
        'outcome', 'ALREADY_COMPLETED',
        'response', v_own.response_payload
      );
    END IF;

    IF v_own.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
       AND v_own.lease_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'ALREADY_CLAIMED',
        'leaseExpiresAt', v_own.lease_expires_at,
        'claimedAt', v_own.claimed_at
      );
    END IF;

    IF v_own.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
       AND v_own.lease_expires_at <= v_now THEN
      UPDATE public.mediation_generation_claims
      SET
        status = 'FAILED'::public.mediation_generation_claim_status,
        completed_at = v_now
      WHERE id = v_own.id;
    END IF;

    SELECT *
    INTO v_active
    FROM public.mediation_generation_claims c
    WHERE c.session_id = p_session_id
      AND c.generation_kind = p_generation_kind
      AND c.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
      AND c.id IS DISTINCT FROM v_own.id
    FOR UPDATE;

    IF FOUND THEN
      IF v_active.lease_expires_at > v_now THEN
        RETURN jsonb_build_object(
          'outcome', 'IN_PROGRESS',
          'leaseExpiresAt', v_active.lease_expires_at
        );
      END IF;

      UPDATE public.mediation_generation_claims
      SET
        status = 'FAILED'::public.mediation_generation_claim_status,
        completed_at = v_now
      WHERE id = v_active.id;
    END IF;

    -- Budget: reclaim / reopen after FAIL or expired lease = new Claude attempt.
    v_llm_call_count := COALESCE(
      (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
      0
    );
    IF v_llm_call_count >= 6 THEN
      RAISE EXCEPTION 'LLM_CALL_BUDGET_EXCEEDED';
    END IF;

    v_payload := v_session.session_payload;
    IF v_payload IS NULL OR jsonb_typeof(v_payload) <> 'object' THEN
      v_payload := '{}'::jsonb;
    END IF;
    IF NOT (v_payload ? 'metadata')
       OR jsonb_typeof(v_payload -> 'metadata') <> 'object' THEN
      v_payload := jsonb_set(v_payload, '{metadata}', '{}'::jsonb, true);
    END IF;
    v_payload := jsonb_set(
      v_payload,
      '{metadata,llmCallCount}',
      to_jsonb(v_llm_call_count + 1),
      true
    );

    UPDATE public.mediation_sessions
    SET session_payload = v_payload
    WHERE session_id = p_session_id
    RETURNING * INTO v_session;

    v_new_token := gen_random_uuid();
    v_lease_expires := v_now + v_lease;

    UPDATE public.mediation_generation_claims
    SET
      claim_token = v_new_token,
      status = 'IN_PROGRESS'::public.mediation_generation_claim_status,
      claimed_at = v_now,
      lease_expires_at = v_lease_expires,
      completed_at = NULL,
      response_payload = NULL
    WHERE id = v_own.id
    RETURNING * INTO v_own;

    RETURN jsonb_build_object(
      'outcome', 'CLAIMED',
      'claimToken', v_own.claim_token,
      'leaseExpiresAt', v_own.lease_expires_at,
      'claimedAt', v_own.claimed_at,
      'reclaimed', true
    );
  END IF;

  SELECT *
  INTO v_active
  FROM public.mediation_generation_claims c
  WHERE c.session_id = p_session_id
    AND c.generation_kind = p_generation_kind
    AND c.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
  FOR UPDATE;

  IF FOUND THEN
    IF v_active.lease_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'IN_PROGRESS',
        'leaseExpiresAt', v_active.lease_expires_at
      );
    END IF;

    UPDATE public.mediation_generation_claims
    SET
      status = 'FAILED'::public.mediation_generation_claim_status,
      completed_at = v_now
    WHERE id = v_active.id;
  END IF;

  -- Budget: first CLAIMED for this request/kind = authorize a new Claude start.
  v_llm_call_count := COALESCE(
    (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
    0
  );
  IF v_llm_call_count >= 6 THEN
    RAISE EXCEPTION 'LLM_CALL_BUDGET_EXCEEDED';
  END IF;

  v_payload := v_session.session_payload;
  IF v_payload IS NULL OR jsonb_typeof(v_payload) <> 'object' THEN
    v_payload := '{}'::jsonb;
  END IF;
  IF NOT (v_payload ? 'metadata')
     OR jsonb_typeof(v_payload -> 'metadata') <> 'object' THEN
    v_payload := jsonb_set(v_payload, '{metadata}', '{}'::jsonb, true);
  END IF;
  v_payload := jsonb_set(
    v_payload,
    '{metadata,llmCallCount}',
    to_jsonb(v_llm_call_count + 1),
    true
  );

  UPDATE public.mediation_sessions
  SET session_payload = v_payload
  WHERE session_id = p_session_id
  RETURNING * INTO v_session;

  v_new_token := gen_random_uuid();
  v_lease_expires := v_now + v_lease;

  INSERT INTO public.mediation_generation_claims (
    session_id,
    generation_kind,
    request_id,
    claim_token,
    status,
    claimed_at,
    lease_expires_at
  )
  VALUES (
    p_session_id,
    p_generation_kind,
    p_request_id,
    v_new_token,
    'IN_PROGRESS'::public.mediation_generation_claim_status,
    v_now,
    v_lease_expires
  )
  RETURNING * INTO v_own;

  RETURN jsonb_build_object(
    'outcome', 'CLAIMED',
    'claimToken', v_own.claim_token,
    'leaseExpiresAt', v_own.lease_expires_at,
    'claimedAt', v_own.claimed_at,
    'reclaimed', false
  );
END;
$$;

COMMENT ON FUNCTION public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
) IS
  'Atomically claims LLM generation rights under mediation_sessions FOR UPDATE. '
  'Outcomes: CLAIMED | ALREADY_CLAIMED | IN_PROGRESS | ALREADY_COMPLETED. '
  'On CLAIMED (including reclaim): increments metadata.llmCallCount (started Claude calls); '
  'hard max 6. Does not increment for ALREADY_CLAIMED | IN_PROGRESS | ALREADY_COMPLETED. '
  'Per-kind content guards: SUMMARY and EASY_CHOICES require empty target fields. '
  'service_role only.';

REVOKE ALL ON FUNCTION public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
) FROM anon;

REVOKE ALL ON FUNCTION public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.claim_mediation_generation(
  uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_generation_status
) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. commit_claimed_mediation_generation (unchanged semantics from 037)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.commit_claimed_mediation_generation(
  p_session_id uuid,
  p_request_id uuid,
  p_claim_token uuid,
  p_generation_kind public.mediation_generation_kind,
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
  v_now timestamptz := clock_timestamp();
  v_session public.mediation_sessions%ROWTYPE;
  v_claim public.mediation_generation_claims%ROWTYPE;
  v_replayed_response jsonb;
  v_inserted_response jsonb;
  v_claim_status public.mediation_generation_claim_status;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_claim_token IS NULL THEN
    RAISE EXCEPTION 'INVALID_CLAIM_TOKEN';
  END IF;

  IF p_generation_kind IS NULL THEN
    RAISE EXCEPTION 'INVALID_GENERATION_KIND';
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

  SELECT *
  INTO v_claim
  FROM public.mediation_generation_claims c
  WHERE c.session_id = p_session_id
    AND c.request_id = p_request_id
    AND c.generation_kind = p_generation_kind
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLAIM_NOT_FOUND';
  END IF;

  IF v_claim.claim_token IS DISTINCT FROM p_claim_token THEN
    RAISE EXCEPTION 'CLAIM_TOKEN_MISMATCH';
  END IF;

  IF v_claim.status = 'SUCCEEDED'::public.mediation_generation_claim_status THEN
    IF v_claim.response_payload IS NOT NULL THEN
      RETURN jsonb_build_object(
        'replayed', true,
        'session', NULL,
        'response', v_claim.response_payload
      );
    END IF;
    RAISE EXCEPTION 'CLAIM_ALREADY_SUCCEEDED';
  END IF;

  IF v_claim.status IS DISTINCT FROM 'IN_PROGRESS'::public.mediation_generation_claim_status THEN
    RAISE EXCEPTION 'CLAIM_NOT_IN_PROGRESS';
  END IF;

  IF v_session.session_version <> p_expected_session_version THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF v_session.current_screen IS DISTINCT FROM p_expected_screen THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- Preserve llmCallCount written by claim_mediation_generation (STARTED calls).
  -- Edge may pass a session_payload snapshot taken before CLAIMED incremented the counter.
  IF v_session.session_payload ? 'metadata'
     AND jsonb_typeof(v_session.session_payload -> 'metadata') = 'object'
     AND (v_session.session_payload -> 'metadata') ? 'llmCallCount' THEN
    IF NOT (p_session_payload ? 'metadata')
       OR jsonb_typeof(p_session_payload -> 'metadata') <> 'object' THEN
      p_session_payload := jsonb_set(
        p_session_payload,
        '{metadata}',
        '{}'::jsonb,
        true
      );
    END IF;
    p_session_payload := jsonb_set(
      p_session_payload,
      '{metadata,llmCallCount}',
      v_session.session_payload -> 'metadata' -> 'llmCallCount',
      true
    );
  END IF;

  SELECT mi.response_payload
  INTO v_replayed_response
  FROM public.mediation_session_idempotency mi
  WHERE mi.session_id = p_session_id
    AND mi.request_id = p_request_id;

  IF FOUND THEN
    RAISE EXCEPTION 'REQUEST_ID_ALREADY_USED';
  END IF;

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
    SELECT c.response_payload, c.status
    INTO v_replayed_response, v_claim_status
    FROM public.mediation_generation_claims c
    WHERE c.id = v_claim.id;

    IF v_claim_status = 'SUCCEEDED'::public.mediation_generation_claim_status
       AND v_replayed_response IS NOT NULL THEN
      RETURN jsonb_build_object(
        'replayed', true,
        'session', NULL,
        'response', v_replayed_response
      );
    END IF;

    RAISE EXCEPTION 'IDEMPOTENCY_RECORD_MISSING';
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

  UPDATE public.mediation_generation_claims
  SET
    status = 'SUCCEEDED'::public.mediation_generation_claim_status,
    completed_at = v_now,
    response_payload = p_response_payload
  WHERE id = v_claim.id;

  RETURN jsonb_build_object(
    'replayed', false,
    'session', to_jsonb(v_session),
    'response', p_response_payload
  );
END;
$$;

COMMENT ON FUNCTION public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) IS
  'Atomically finalizes a claimed generation. service_role only.';

REVOKE ALL ON FUNCTION public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM anon;

REVOKE ALL ON FUNCTION public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.commit_claimed_mediation_generation(
  uuid, uuid, uuid, public.mediation_generation_kind, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint, jsonb
) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. fail_mediation_generation_claim (unchanged semantics from 037)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fail_mediation_generation_claim(
  p_session_id uuid,
  p_request_id uuid,
  p_claim_token uuid,
  p_generation_kind public.mediation_generation_kind
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_session public.mediation_sessions%ROWTYPE;
  v_claim public.mediation_generation_claims%ROWTYPE;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  IF p_claim_token IS NULL THEN
    RAISE EXCEPTION 'INVALID_CLAIM_TOKEN';
  END IF;

  IF p_generation_kind IS NULL THEN
    RAISE EXCEPTION 'INVALID_GENERATION_KIND';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_claim
  FROM public.mediation_generation_claims c
  WHERE c.session_id = p_session_id
    AND c.request_id = p_request_id
    AND c.generation_kind = p_generation_kind
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLAIM_NOT_FOUND';
  END IF;

  IF v_claim.claim_token IS DISTINCT FROM p_claim_token THEN
    RAISE EXCEPTION 'CLAIM_TOKEN_MISMATCH';
  END IF;

  IF v_claim.status = 'SUCCEEDED'::public.mediation_generation_claim_status THEN
    RAISE EXCEPTION 'CLAIM_ALREADY_SUCCEEDED';
  END IF;

  IF v_claim.status = 'FAILED'::public.mediation_generation_claim_status THEN
    RETURN jsonb_build_object(
      'ok', true,
      'alreadyFailed', true,
      'claimId', v_claim.id
    );
  END IF;

  IF v_claim.status IS DISTINCT FROM 'IN_PROGRESS'::public.mediation_generation_claim_status THEN
    RAISE EXCEPTION 'CLAIM_NOT_IN_PROGRESS';
  END IF;

  UPDATE public.mediation_generation_claims
  SET
    status = 'FAILED'::public.mediation_generation_claim_status,
    completed_at = v_now
  WHERE id = v_claim.id
  RETURNING * INTO v_claim;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyFailed', false,
    'claimId', v_claim.id,
    'status', v_claim.status
  );
END;
$$;

COMMENT ON FUNCTION public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
) IS
  'Marks an owned IN_PROGRESS generation claim as FAILED without mutating mediation_sessions. '
  'service_role only.';

REVOKE ALL ON FUNCTION public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
) FROM anon;

REVOKE ALL ON FUNCTION public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fail_mediation_generation_claim(
  uuid, uuid, uuid, public.mediation_generation_kind
) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. commit_mediation_action (unchanged semantics from 035; rebound to new enum)
-- ═══════════════════════════════════════════════════════════════════════════

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
  'Minimal atomic session row commit helper. service_role only.';

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
