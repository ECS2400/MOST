-- Dziennik wdzięczności — codzienne wpisy, opcjonalnie widoczne dla partnera
CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items TEXT[] NOT NULL DEFAULT '{}',
  share_with_partner BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS gratitude_entries_user_date_idx
  ON public.gratitude_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS gratitude_entries_couple_idx
  ON public.gratitude_entries(couple_id, entry_date DESC)
  WHERE share_with_partner = true;

ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gratitude entries"
  ON public.gratitude_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners read shared gratitude entries"
  ON public.gratitude_entries FOR SELECT
  USING (
    share_with_partner = true
    AND couple_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = gratitude_entries.couple_id
        AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
        AND gratitude_entries.user_id <> auth.uid()
    )
  );
