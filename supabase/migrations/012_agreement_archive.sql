-- Archiwum ustaleń z mediacji (Nasze ustalenia)
CREATE TABLE IF NOT EXISTS public.agreement_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  mediation_id UUID REFERENCES public.mediations(id) ON DELETE CASCADE,
  source_agreement_id TEXT NOT NULL,
  text TEXT NOT NULL,
  responsible TEXT NOT NULL DEFAULT 'both',
  archive_status TEXT NOT NULL DEFAULT 'active'
    CHECK (archive_status IN ('active', 'needs_refresh')),
  mediation_title TEXT,
  mediation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mediation_id, source_agreement_id)
);

CREATE INDEX IF NOT EXISTS agreement_archive_couple_idx
  ON public.agreement_archive(couple_id, updated_at DESC)
  WHERE couple_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS agreement_archive_user_idx
  ON public.agreement_archive(user_id, updated_at DESC);

ALTER TABLE public.agreement_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own agreement archive"
  ON public.agreement_archive FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      couple_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.couples c
        WHERE c.id = agreement_archive.couple_id
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users insert own agreement archive"
  ON public.agreement_archive FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update agreement archive they can read"
  ON public.agreement_archive FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      couple_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.couples c
        WHERE c.id = agreement_archive.couple_id
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users delete own agreement archive rows"
  ON public.agreement_archive FOR DELETE
  USING (auth.uid() = user_id);
