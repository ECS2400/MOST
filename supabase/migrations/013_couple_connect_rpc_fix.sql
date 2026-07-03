-- Szybka poprawka: funkcja connect_couple_by_invite_code bez kolumny connected_at
-- Wklej w Supabase SQL Editor i uruchom.

CREATE OR REPLACE FUNCTION public.connect_couple_by_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joiner_id uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_owner_id uuid;
  v_owner_couple_id uuid;
  v_couple_id uuid;
  v_invite public.couples%ROWTYPE;
  v_partner_name text;
  v_partner_email text;
  v_partner_avatar text;
  v_partner_plan text;
  v_connected_at timestamptz := now();
BEGIN
  IF v_joiner_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  SELECT id, couple_id
  INTO v_owner_id, v_owner_couple_id
  FROM public.profiles
  WHERE upper(trim(invite_code)) = v_code
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    SELECT partner_1_id
    INTO v_owner_id
    FROM public.couples
    WHERE upper(trim(invite_code)) = v_code
      AND partner_2_id IS NULL
    LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
      SELECT couple_id INTO v_owner_couple_id
      FROM public.profiles
      WHERE id = v_owner_id;
    END IF;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  IF v_owner_id = v_joiner_id THEN
    RAISE EXCEPTION 'OWN_CODE';
  END IF;

  IF v_owner_couple_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.couples c
      WHERE c.id = v_owner_couple_id
        AND c.partner_2_id IS NOT NULL
        AND c.partner_2_id <> v_joiner_id
    ) THEN
      RAISE EXCEPTION 'CODE_ALREADY_USED';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.couples c ON c.id = p.couple_id
    WHERE p.id = v_joiner_id
      AND c.partner_2_id IS NOT NULL
      AND c.partner_2_id <> v_owner_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_CONNECTED';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.couples
  WHERE partner_1_id = v_owner_id
    AND partner_2_id IS NULL
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.couples (partner_1_id, partner_2_id, invite_code)
    VALUES (v_owner_id, NULL, v_code)
    RETURNING * INTO v_invite;
  END IF;

  v_couple_id := v_invite.id;

  UPDATE public.couples
  SET
    partner_2_id = v_joiner_id,
    invite_code = v_code
  WHERE id = v_couple_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id, partner_id = v_owner_id
  WHERE id = v_joiner_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id, partner_id = v_joiner_id
  WHERE id = v_owner_id;

  SELECT name, email, avatar_color, plan
  INTO v_partner_name, v_partner_email, v_partner_avatar, v_partner_plan
  FROM public.profiles
  WHERE id = v_owner_id;

  RETURN jsonb_build_object(
    'couple_id', v_couple_id,
    'partner_id', v_owner_id,
    'partner_name', coalesce(nullif(trim(v_partner_name), ''), 'Partner'),
    'partner_email', coalesce(v_partner_email, ''),
    'partner_avatar_color', coalesce(v_partner_avatar, '#F97316'),
    'partner_plan', coalesce(v_partner_plan, 'free'),
    'invite_code', v_code,
    'connected_at', v_connected_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.connect_couple_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connect_couple_by_invite_code(text) TO authenticated;
