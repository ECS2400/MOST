-- Allow connected couple members to read/send live_messages for shared mediations.
-- Fixes partner INSERT/SELECT blocked when partner_id is unset but couple_id links the pair.
--
-- RLS audit notes:
-- - No recursion: policies read public.mediations and public.couples only.
-- - couples policies do not reference live_messages.
-- - mediations policies do not reference live_messages.
-- - Realtime: live_messages is already in supabase_realtime (018_live_messages_realtime.sql);
--   partner SELECT below is sufficient to receive realtime payloads.

DROP POLICY IF EXISTS "Participants can view live messages" ON public.live_messages;
CREATE POLICY "Participants can view live messages"
  ON public.live_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mediations m
      WHERE m.id = live_messages.mediation_id
        AND (
          m.user_id = auth.uid()
          OR m.partner_id = auth.uid()
          OR (
            m.couple_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.couples c
              WHERE c.id = m.couple_id
                AND c.partner_2_id IS NOT NULL
                AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
            )
          )
        )
    )
    AND (
      live_messages.is_private = false
      OR live_messages.recipient_id = auth.uid()
      OR live_messages.sender_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Participants can send live messages" ON public.live_messages;
CREATE POLICY "Participants can send live messages"
  ON public.live_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.mediations m
      WHERE m.id = live_messages.mediation_id
        AND (
          m.user_id = auth.uid()
          OR m.partner_id = auth.uid()
          OR (
            m.couple_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.couples c
              WHERE c.id = m.couple_id
                AND c.partner_2_id IS NOT NULL
                AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
            )
          )
        )
    )
    AND (
      live_messages.sender_id = auth.uid()::text
      OR (
        live_messages.sender_id = 'ai'
        AND EXISTS (
          SELECT 1
          FROM public.mediations m
          WHERE m.id = live_messages.mediation_id
            AND m.user_id = auth.uid()
        )
      )
    )
  );
