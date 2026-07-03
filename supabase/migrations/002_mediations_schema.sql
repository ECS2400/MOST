-- Mediations table for the new AI mediation flow
CREATE TABLE IF NOT EXISTS public.mediations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  what_happened TEXT,
  what_angered TEXT,
  how_felt TEXT,
  what_needed TEXT,
  what_to_say TEXT,
  combined_description TEXT NOT NULL DEFAULT '',
  pasted_text TEXT,
  screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mediations_user_id_idx ON public.mediations(user_id);
CREATE INDEX IF NOT EXISTS mediations_created_at_idx ON public.mediations(created_at DESC);

ALTER TABLE public.mediations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mediations"
  ON public.mediations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mediations"
  ON public.mediations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mediations"
  ON public.mediations FOR UPDATE
  USING (auth.uid() = user_id);
