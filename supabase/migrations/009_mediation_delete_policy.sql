-- Allow users to permanently delete their own mediations (cascades to live_messages).
CREATE POLICY "Users can delete own mediations"
  ON public.mediations FOR DELETE
  USING (user_id = auth.uid());

-- ─── Ręczne wdrożenie (Supabase SQL Editor) ───────────────────────────────────
-- CREATE POLICY "Users can delete own mediations"
--   ON public.mediations FOR DELETE
--   USING (user_id = auth.uid());
