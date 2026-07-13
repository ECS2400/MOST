-- Allow connected couple members to read/update shared live mediations when couple_id is set.
-- Fixes partner RuntimeSession unavailable when partner_id was not yet linked on the row.
--
-- RLS audit notes:
-- - No recursion: policy reads public.couples only (couples policies do not reference mediations).
-- - Scope: couple_id on the row must match a couples row where auth.uid() is partner_1 or partner_2.
-- - Requires partner_2_id IS NOT NULL so only fully linked pairs gain access (not open invites).
-- - Does not grant access to unrelated mediations or other couples.

DROP POLICY IF EXISTS "Users can view own mediations" ON public.mediations;
CREATE POLICY "Users can view own mediations"
  ON public.mediations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (
      couple_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.couples c
        WHERE c.id = mediations.couple_id
          AND c.partner_2_id IS NOT NULL
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Participants can update mediation session" ON public.mediations;
CREATE POLICY "Participants can update mediation session"
  ON public.mediations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (
      couple_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.couples c
        WHERE c.id = mediations.couple_id
          AND c.partner_2_id IS NOT NULL
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = partner_id
    OR (
      couple_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.couples c
        WHERE c.id = mediations.couple_id
          AND c.partner_2_id IS NOT NULL
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );
