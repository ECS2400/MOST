-- Repair mediations submit path: RLS insert/select, status constraint, screenshot_urls type.

ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_happened TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_angered TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS how_felt TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_needed TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_to_say TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS combined_description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS pasted_text TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL;

DO $$
BEGIN
  -- Recover from a partial run (old column dropped, temp column left behind).
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mediations'
      AND column_name = 'screenshot_urls_tmp'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mediations'
      AND column_name = 'screenshot_urls'
  ) THEN
    ALTER TABLE public.mediations
      RENAME COLUMN screenshot_urls_tmp TO screenshot_urls;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mediations'
      AND column_name = 'screenshot_urls'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.mediations
      ADD COLUMN IF NOT EXISTS screenshot_urls_tmp TEXT[] NOT NULL DEFAULT '{}';

    UPDATE public.mediations
    SET screenshot_urls_tmp = CASE
      WHEN screenshot_urls IS NULL THEN '{}'::text[]
      WHEN jsonb_typeof(screenshot_urls) = 'array' THEN
        ARRAY(
          SELECT jsonb_array_elements_text(screenshot_urls)
        )
      ELSE '{}'::text[]
    END;

    ALTER TABLE public.mediations
      DROP COLUMN screenshot_urls;

    ALTER TABLE public.mediations
      RENAME COLUMN screenshot_urls_tmp TO screenshot_urls;

    ALTER TABLE public.mediations
      ALTER COLUMN screenshot_urls SET DEFAULT '{}';

    ALTER TABLE public.mediations
      ALTER COLUMN screenshot_urls SET NOT NULL;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mediations'
      AND column_name = 'screenshot_urls'
  ) THEN
    ALTER TABLE public.mediations
      ADD COLUMN screenshot_urls TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

ALTER TABLE public.mediations
  ALTER COLUMN screenshot_urls SET DEFAULT '{}';

ALTER TABLE public.mediations DROP CONSTRAINT IF EXISTS mediations_status_check;
ALTER TABLE public.mediations ADD CONSTRAINT mediations_status_check
  CHECK (status IN (
    'pending', 'analyzing', 'completed', 'failed',
    'cancelled', 'inviting', 'live',
    'pending_agreements', 'resolved'
  ));

ALTER TABLE public.mediations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mediations" ON public.mediations;
CREATE POLICY "Users can view own mediations"
  ON public.mediations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can insert own mediations" ON public.mediations;
CREATE POLICY "Users can insert own mediations"
  ON public.mediations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mediations" ON public.mediations;
DROP POLICY IF EXISTS "Participants can update mediation session" ON public.mediations;
CREATE POLICY "Participants can update mediation session"
  ON public.mediations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);
