-- Partner access to shared mediations + partner perspective fields

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_what_happened TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_what_angered TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_how_felt TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_what_needed TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_what_to_say TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_combined_description TEXT;

ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS partner_analysis JSONB;

DROP POLICY IF EXISTS "Users can view own mediations" ON public.mediations;
CREATE POLICY "Users can view own mediations"
  ON public.mediations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Participants can update mediation session" ON public.mediations;
CREATE POLICY "Participants can update mediation session"
  ON public.mediations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE OR REPLACE FUNCTION public.get_mediation_by_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text := trim(p_code);
  v_row public.mediations%ROWTYPE;
  v_host public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  SELECT *
  INTO v_row
  FROM public.mediations
  WHERE invite_code = v_code
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  IF v_row.user_id = v_user_id THEN
    RAISE EXCEPTION 'OWN_MEDIATION';
  END IF;

  IF v_row.partner_id IS NOT NULL AND v_row.partner_id <> v_user_id THEN
    RAISE EXCEPTION 'CODE_ALREADY_USED';
  END IF;

  IF v_row.partner_id IS NULL THEN
    UPDATE public.mediations
    SET partner_id = v_user_id,
        updated_at = now()
    WHERE id = v_row.id;
    v_row.partner_id := v_user_id;
  END IF;

  SELECT * INTO v_host FROM public.profiles WHERE id = v_row.user_id;

  RETURN jsonb_build_object(
    'mediation_id', v_row.id,
    'status', v_row.status,
    'partner_joined', v_row.partner_joined,
    'host_name', coalesce(nullif(trim(v_host.name), ''), 'Partner'),
    'host_id', v_row.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mediation_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mediation_by_invite_code(text) TO authenticated;
