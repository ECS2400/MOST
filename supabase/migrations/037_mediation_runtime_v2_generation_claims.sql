-- Mediation Runtime V2 — Etap 2C:
--   1) create_mediation_session no longer writes CREATED into mediation_session_idempotency
--   2) mediation_generation_claims + claim / finalize / fail RPCs
--
-- Guarantee boundary (documented, not absolute exactly-once LLM):
--   - at most one active generation claim per (session_id, generation_kind)
--   - no concurrent duplicate callers may CLAIM concurrently
--   - session mutation is exactly-once via claim finalize + action idempotency
--   - if the Edge process dies after the LLM responds but before finalize,
--     a later reclaim after lease expiry MAY invoke Anthropic again
--     (provider-side idempotency is not assumed)
--
-- Does NOT modify migrations 031–036, Edge Functions, or React Native.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Claim status enum
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE public.mediation_generation_claim_status AS ENUM (
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED'
);

COMMENT ON TYPE public.mediation_generation_claim_status IS
  'Lifecycle of a single generation claim: active lease, successful finalize, or failed/interrupted.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Generation claims table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.mediation_generation_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL
    REFERENCES public.mediation_sessions(session_id) ON DELETE CASCADE,
  generation_kind public.mediation_generation_kind NOT NULL,
  request_id uuid NOT NULL,
  claim_token uuid NOT NULL DEFAULT gen_random_uuid(),
  status public.mediation_generation_claim_status NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  response_payload jsonb NULL,

  CONSTRAINT mediation_generation_claims_request_unique
    UNIQUE (session_id, request_id, generation_kind),

  CONSTRAINT mediation_generation_claims_response_payload_is_object
    CHECK (
      response_payload IS NULL
      OR jsonb_typeof(response_payload) = 'object'
    ),

  CONSTRAINT mediation_generation_claims_lease_after_claimed
    CHECK (lease_expires_at > claimed_at),

  CONSTRAINT mediation_generation_claims_completed_requires_terminal
    CHECK (
      (status = 'IN_PROGRESS' AND completed_at IS NULL)
      OR (status IN ('SUCCEEDED', 'FAILED') AND completed_at IS NOT NULL)
    ),

  CONSTRAINT mediation_generation_claims_succeeded_has_response
    CHECK (
      status <> 'SUCCEEDED'
      OR response_payload IS NOT NULL
    )
);

COMMENT ON TABLE public.mediation_generation_claims IS
  'Atomically claimed LLM generation rights. Serialized via session row FOR UPDATE in RPCs. '
  'Partial unique index enforces at most one IN_PROGRESS claim per (session_id, generation_kind). '
  'Lease expiry is evaluated inside RPCs (not in the index predicate).';

COMMENT ON COLUMN public.mediation_generation_claims.claim_token IS
  'Secret ownership proof returned ONLY on outcome CLAIMED (including reclaim). '
  'Never returned for ALREADY_CLAIMED, IN_PROGRESS, or ALREADY_COMPLETED. Required for finalize and fail.';

COMMENT ON COLUMN public.mediation_generation_claims.lease_expires_at IS
  'Hard lease end. After expiry another caller may mark this claim FAILED and start a new attempt. '
  'Reclaim after expiry does NOT prove the previous LLM call never completed.';

-- At most one active (IN_PROGRESS) claim per session + generation kind.
-- Predicate is status-only; lease validity is enforced in claim RPCs under session lock.
CREATE UNIQUE INDEX mediation_generation_claims_one_in_progress
  ON public.mediation_generation_claims (session_id, generation_kind)
  WHERE status = 'IN_PROGRESS';

CREATE INDEX mediation_generation_claims_session_kind_idx
  ON public.mediation_generation_claims (session_id, generation_kind, claimed_at DESC);

CREATE INDEX mediation_generation_claims_lease_idx
  ON public.mediation_generation_claims (lease_expires_at)
  WHERE status = 'IN_PROGRESS';

ALTER TABLE public.mediation_generation_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.mediation_generation_claims FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_generation_claims FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.mediation_generation_claims FROM authenticated;

GRANT ALL PRIVILEGES ON TABLE public.mediation_generation_claims TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Replace create_mediation_session — drop CREATED idempotency writes
-- ═══════════════════════════════════════════════════════════════════════════
-- Domain uniqueness remains mediation_sessions_mediation_id_unique (UNIQUE mediation_id).
-- Signature change: drop unused p_request_id (was only used for CREATED idempotency rows).
-- Consequence: callers (Edge) must stop passing p_request_id after deploying this migration.

DROP FUNCTION IF EXISTS public.create_mediation_session(
  uuid, uuid, uuid, uuid, text, text, text, uuid
);

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
    'SUMMARY_EASY_CHOICES'::public.mediation_generation_kind,
    6,
    v_prompt_version,
    v_model_version
  )
  ON CONFLICT (mediation_id) DO NOTHING
  RETURNING * INTO v_session;

  IF FOUND THEN
    -- Intentionally does NOT insert into mediation_session_idempotency.
    -- That table is reserved for committed runtime action / generation responses.
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
  'Concurrency-safe via ON CONFLICT (mediation_id). Does not write mediation_session_idempotency. '
  'service_role only.';

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
-- 3. claim_mediation_generation
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
  v_new_token uuid;
  v_lease_expires timestamptz;
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

  -- SUMMARY bootstrap: require unset summary before claiming SUMMARY_EASY_CHOICES.
  IF p_generation_kind = 'SUMMARY_EASY_CHOICES'::public.mediation_generation_kind THEN
    v_summary_json := v_session.session_payload -> 'summary';
    IF v_summary_json IS NOT NULL
       AND jsonb_typeof(v_summary_json) = 'string'
       AND btrim(v_summary_json #>> '{}') <> '' THEN
      RAISE EXCEPTION 'SUMMARY_ALREADY_PRESENT';
    END IF;
  END IF;

  -- Existing claim for this request + kind
  SELECT *
  INTO v_own
  FROM public.mediation_generation_claims c
  WHERE c.session_id = p_session_id
    AND c.request_id = p_request_id
    AND c.generation_kind = p_generation_kind
  FOR UPDATE;

  IF FOUND THEN
    IF v_own.status = 'SUCCEEDED'::public.mediation_generation_claim_status THEN
      -- Public response only — never re-expose claim_token to a second instance.
      RETURN jsonb_build_object(
        'outcome', 'ALREADY_COMPLETED',
        'response', v_own.response_payload
      );
    END IF;

    IF v_own.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
       AND v_own.lease_expires_at > v_now THEN
      -- Same request still owns an active lease — do NOT authorize a second LLM call
      -- and do NOT return claim_token (only the original CLAIMED response held it).
      RETURN jsonb_build_object(
        'outcome', 'ALREADY_CLAIMED',
        'leaseExpiresAt', v_own.lease_expires_at,
        'claimedAt', v_own.claimed_at
      );
    END IF;

    -- Own claim FAILED, or IN_PROGRESS lease expired → interrupt then reopen same row.
    IF v_own.status = 'IN_PROGRESS'::public.mediation_generation_claim_status
       AND v_own.lease_expires_at <= v_now THEN
      UPDATE public.mediation_generation_claims
      SET
        status = 'FAILED'::public.mediation_generation_claim_status,
        completed_at = v_now
      WHERE id = v_own.id;
      -- Boundary: a previous Edge may still finish Anthropic after this mark;
      -- reclaim authorizes a new LLM attempt and does not prove provider exactly-once.
    END IF;

    -- Another request may hold a live IN_PROGRESS claim — do not steal via unique violation.
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

  -- Foreign active claim?
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
    -- Interrupted by lease expiry; new claim may re-invoke LLM.
  END IF;

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
  'ALREADY_CLAIMED must not trigger a second Anthropic call and never re-exposes claim_token. '
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
-- 4. commit_claimed_mediation_generation
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

  -- Claim lock + ownership BEFORE any action-idempotency replay.
  -- mediation_session_idempotency is keyed only by (session_id, request_id) and must
  -- never return a foreign operation's response without proving claim binding:
  -- request_id ↔ generation_kind ↔ claim_token.
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

  -- Allow finalize even if lease clock elapsed, as long as claim is still IN_PROGRESS
  -- and token matches (no intervening reclaim). Prevents discarding a valid LLM result
  -- that finished just after lease expiry. Reclaim under lock would have set FAILED.

  IF v_session.session_version <> p_expected_session_version THEN
    RAISE EXCEPTION 'SESSION_VERSION_CONFLICT';
  END IF;

  IF v_session.current_screen IS DISTINCT FROM p_expected_screen THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- request_id is session-scoped for action idempotency (PK without generation_kind).
  -- If this request_id was already used by another successful action/generation,
  -- refuse — do not return that foreign response as a "replay" of this kind.
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
    -- Concurrent finalize of the same claim lost the insert race after our claim
    -- checks; only safe replay is THIS claim's eventual SUCCEEDED payload — never
    -- a blind idempotency read (could be a foreign write with the same request_id).
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
  'Atomically finalizes a claimed generation: validates claim_token, mutates session once, '
  'writes public response to mediation_session_idempotency, marks claim SUCCEEDED. '
  'service_role only. Prefer this over commit_mediation_action for LLM content commits.';

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
-- 5. fail_mediation_generation_claim
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

  -- Session row intentionally unchanged (payload, version, generation_status untouched).

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
  'Does not produce fallback content. service_role only.';

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
