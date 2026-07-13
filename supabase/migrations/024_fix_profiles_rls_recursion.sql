-- Fix infinite recursion in profiles SELECT RLS.
--
-- Root cause: policy "Users read connected partner profile" queried public.profiles
-- inside its own USING clause, re-triggering profiles RLS indefinitely.
--
-- Fix: read auth user's partner_id via SECURITY DEFINER helper (bypasses RLS once).

CREATE OR REPLACE FUNCTION public.get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND partner_id IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_partner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_partner_id() TO authenticated;

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
    OR profiles.id = public.get_auth_partner_id()
  );
