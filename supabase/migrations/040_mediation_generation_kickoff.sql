-- Mediation Runtime V2 — 040: atomic generation kickoff + claim
--
-- Fixes pre-cutover blockers:
--   1) llmCallCount hard max 6 → 7 (COMPROMISE path + 1 technical RETRY)
--   2) One client requestId covers kickoff + claim (no server UUID namespace)
--
-- First divergence (035/037/038):
--   commit_mediation_action(R) inserts into mediation_session_idempotency
--   commit_claimed_mediation_generation(R) then raises REQUEST_ID_ALREADY_USED
--   Edge workaround used crypto.randomUUID() for kickoff — not contractual.
--
-- This migration adds start_mediation_generation:
--   kickoff mutation + claim under the same client requestId in ONE transaction.
--   Does NOT write mediation_session_idempotency (final response stays on finalize/fail).
--
-- Does NOT: db push, Edge deploy, RN, new screens, new tables.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Budget: claim_mediation_generation hard max 6 → 7
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

    v_llm_call_count := COALESCE(
      (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
      0
    );
    IF v_llm_call_count >= 7 THEN
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
      'reclaimed', true,
      'session', to_jsonb(v_session)
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

  v_llm_call_count := COALESCE(
    (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
    0
  );
  IF v_llm_call_count >= 7 THEN
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
    'reclaimed', false,
    'session', to_jsonb(v_session)
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
  'hard max 7. Does not write mediation_session_idempotency. service_role only.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. start_mediation_generation — kickoff + claim, one client requestId
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.start_mediation_generation(
  p_session_id uuid,
  p_request_id uuid,
  p_expected_session_version integer,
  p_expected_screen public.mediation_screen,
  p_next_screen public.mediation_screen,
  p_session_payload jsonb,
  p_generation_status public.mediation_generation_status,
  p_generation_kind public.mediation_generation_kind,
  p_progress_total smallint
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
  v_idempotency_response jsonb;
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

  IF p_generation_status NOT IN (
    'GENERATING_CONTENT'::public.mediation_generation_status,
    'GENERATING_COMPROMISE'::public.mediation_generation_status
  ) THEN
    RAISE EXCEPTION 'INVALID_GENERATION_STATUS';
  END IF;

  IF p_generation_kind IS NULL THEN
    RAISE EXCEPTION 'INVALID_GENERATION_KIND';
  END IF;

  IF p_progress_total IS NULL OR p_progress_total NOT IN (6, 7) THEN
    RAISE EXCEPTION 'INVALID_PROGRESS_TOTAL';
  END IF;

  SELECT *
  INTO v_session
  FROM public.mediation_sessions ms
  WHERE ms.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  -- Final or failure response already stored for this client requestId.
  SELECT mi.response_payload
  INTO v_idempotency_response
  FROM public.mediation_session_idempotency mi
  WHERE mi.session_id = p_session_id
    AND mi.request_id = p_request_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'ALREADY_COMPLETED',
      'response', v_idempotency_response,
      'session', NULL
    );
  END IF;

  -- Same requestId already started generation (kickoff done; no second kickoff).
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
        'response', v_own.response_payload,
        'session', NULL
      );
    END IF;

    IF v_own.status = 'FAILED'::public.mediation_generation_claim_status THEN
      -- Client must use a new requestId for RETRY after failure.
      RAISE EXCEPTION 'REQUEST_ID_ALREADY_USED';
    END IF;

    IF v_own.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
       AND v_own.lease_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'ALREADY_CLAIMED',
        'leaseExpiresAt', v_own.lease_expires_at,
        'claimedAt', v_own.claimed_at,
        'session', to_jsonb(v_session)
      );
    END IF;

    -- Expired lease of THIS request: reclaim only (kickoff already applied).
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
          'leaseExpiresAt', v_active.lease_expires_at,
          'session', to_jsonb(v_session)
        );
      END IF;

      UPDATE public.mediation_generation_claims
      SET
        status = 'FAILED'::public.mediation_generation_claim_status,
        completed_at = v_now
      WHERE id = v_active.id;
    END IF;

    IF v_session.generation_status NOT IN (
      'GENERATING_CONTENT'::public.mediation_generation_status,
      'GENERATING_COMPROMISE'::public.mediation_generation_status
    ) THEN
      RAISE EXCEPTION 'INVALID_GENERATION_STATUS';
    END IF;

    IF v_session.last_generation_kind IS DISTINCT FROM p_generation_kind THEN
      RAISE EXCEPTION 'INVALID_GENERATION_KIND';
    END IF;

    v_llm_call_count := COALESCE(
      (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
      0
    );
    IF v_llm_call_count >= 7 THEN
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
      'reclaimed', true,
      'session', to_jsonb(v_session)
    );
  END IF;

  -- Fresh kickoff: optimistic concurrency + allowed source status.
  IF v_session.session_version <> p_expected_session_version THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF v_session.current_screen IS DISTINCT FROM p_expected_screen THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF v_session.generation_status NOT IN (
    'IDLE'::public.mediation_generation_status,
    'FAILED'::public.mediation_generation_status
  ) THEN
    RAISE EXCEPTION 'INVALID_GENERATION_STATUS';
  END IF;

  -- Another IN_PROGRESS claim for this kind blocks fresh kickoff.
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
        'leaseExpiresAt', v_active.lease_expires_at,
        'session', to_jsonb(v_session)
      );
    END IF;

    UPDATE public.mediation_generation_claims
    SET
      status = 'FAILED'::public.mediation_generation_claim_status,
      completed_at = v_now
    WHERE id = v_active.id;
  END IF;

  -- Authoritative counter is session row (Edge snapshot may be stale).
  v_llm_call_count := COALESCE(
    (v_session.session_payload #>> '{metadata,llmCallCount}')::integer,
    0
  );
  IF v_llm_call_count >= 7 THEN
    RAISE EXCEPTION 'LLM_CALL_BUDGET_EXCEEDED';
  END IF;

  v_payload := p_session_payload;
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
  SET
    session_payload = v_payload,
    current_screen = p_next_screen,
    generation_status = p_generation_status,
    last_generation_kind = p_generation_kind,
    progress_total = p_progress_total,
    session_version = session_version + 1
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

  -- Intentionally does NOT insert mediation_session_idempotency.
  -- Final public response is written only by commit_claimed_mediation_generation
  -- or by commit_mediation_action(FAILED) after fail_mediation_generation_claim.

  RETURN jsonb_build_object(
    'outcome', 'CLAIMED',
    'claimToken', v_own.claim_token,
    'leaseExpiresAt', v_own.lease_expires_at,
    'claimedAt', v_own.claimed_at,
    'reclaimed', false,
    'session', to_jsonb(v_session)
  );
END;
$$;

COMMENT ON FUNCTION public.start_mediation_generation(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint
) IS
  'Atomically applies Case B / RETRY kickoff (votes/confirmations/status) and claims '
  'LLM generation under the same client requestId. session_version +1 once on fresh kickoff. '
  'Outcomes: CLAIMED | ALREADY_CLAIMED | IN_PROGRESS | ALREADY_COMPLETED. '
  'Does not write mediation_session_idempotency. Hard max llmCallCount 7 on CLAIMED. '
  'service_role only.';

REVOKE ALL ON FUNCTION public.start_mediation_generation(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.start_mediation_generation(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint
) FROM anon;

REVOKE ALL ON FUNCTION public.start_mediation_generation(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.start_mediation_generation(
  uuid, uuid, integer,
  public.mediation_screen, public.mediation_screen,
  jsonb, public.mediation_generation_status, public.mediation_generation_kind,
  smallint
) TO service_role;
