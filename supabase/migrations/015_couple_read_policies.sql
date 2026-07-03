-- Let authenticated users read their couple rows and partner profiles.
-- Without this, refreshCouple cannot load connection state in the UI.

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own couples" ON public.couples;
CREATE POLICY "Users read own couples"
  ON public.couples
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = partner_1_id
    OR auth.uid() = partner_2_id
  );

DROP POLICY IF EXISTS "Users update own couples" ON public.couples;
CREATE POLICY "Users update own couples"
  ON public.couples
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = partner_1_id
    OR auth.uid() = partner_2_id
  );

DROP POLICY IF EXISTS "Users insert own pending couples" ON public.couples;
CREATE POLICY "Users insert own pending couples"
  ON public.couples
  FOR INSERT
  TO authenticated
  WITH CHECK (partner_1_id = auth.uid());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users read connected partner profile" ON public.profiles;
CREATE POLICY "Users read connected partner profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couples c
      WHERE c.partner_2_id IS NOT NULL
        AND (
          (c.partner_1_id = auth.uid() AND c.partner_2_id = profiles.id)
          OR (c.partner_2_id = auth.uid() AND c.partner_1_id = profiles.id)
        )
    )
    OR id = (
      SELECT p.partner_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.partner_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Reliable connection read for the app (bypasses RLS edge cases).
CREATE OR REPLACE FUNCTION public.get_my_couple_connection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_couple public.couples%ROWTYPE;
  v_partner public.profiles%ROWTYPE;
  v_partner_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('connected', false);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('connected', false);
  END IF;

  IF v_profile.couple_id IS NOT NULL THEN
    SELECT * INTO v_couple FROM public.couples WHERE id = v_profile.couple_id;
  END IF;

  IF v_couple.id IS NULL OR v_couple.partner_2_id IS NULL THEN
    SELECT * INTO v_couple
    FROM public.couples
    WHERE partner_2_id IS NOT NULL
      AND (partner_1_id = v_user_id OR partner_2_id = v_user_id)
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_couple.id IS NULL OR v_couple.partner_2_id IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'invite_code', upper(trim(v_profile.invite_code))
    );
  END IF;

  v_partner_id := CASE
    WHEN v_couple.partner_1_id = v_user_id THEN v_couple.partner_2_id
    ELSE v_couple.partner_1_id
  END;

  SELECT * INTO v_partner FROM public.profiles WHERE id = v_partner_id;

  -- Keep profile pointers in sync if they drifted.
  IF v_profile.couple_id IS DISTINCT FROM v_couple.id
     OR v_profile.partner_id IS DISTINCT FROM v_partner_id THEN
    UPDATE public.profiles
    SET couple_id = v_couple.id, partner_id = v_partner_id
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'connected', true,
    'couple_id', v_couple.id,
    'invite_code', coalesce(
      nullif(upper(trim(v_profile.invite_code)), ''),
      nullif(upper(trim(v_couple.invite_code)), '')
    ),
    'connected_at', coalesce(v_couple.created_at, now()),
    'user1_id', v_couple.partner_1_id,
    'user2_id', v_couple.partner_2_id,
    'partner', jsonb_build_object(
      'id', v_partner.id,
      'email', v_partner.email,
      'name', v_partner.name,
      'avatar_color', v_partner.avatar_color,
      'avatar_url', v_partner.avatar_url,
      'plan', v_partner.plan,
      'created_at', v_partner.created_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_couple_connection() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_couple_connection() TO authenticated;
