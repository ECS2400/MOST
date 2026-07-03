-- Repair mediations table when created before migration 002 or with incomplete schema.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_happened TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_angered TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS how_felt TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_needed TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS what_to_say TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS combined_description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS pasted_text TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS partner_joined BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS partner_joined_at TIMESTAMPTZ;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS live_phase INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS live_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS live_progress INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS current_question TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS partner_typing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS live_summary JSONB;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill combined_description from legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mediations' AND column_name = 'description'
  ) THEN
    UPDATE public.mediations
    SET combined_description = COALESCE(NULLIF(combined_description, ''), description, '')
    WHERE combined_description IS NULL OR combined_description = '';
  END IF;
END $$;

ALTER TABLE public.mediations DROP CONSTRAINT IF EXISTS mediations_status_check;
ALTER TABLE public.mediations ADD CONSTRAINT mediations_status_check
  CHECK (status IN (
    'pending', 'analyzing', 'completed', 'failed',
    'cancelled', 'inviting', 'live',
    'pending_agreements', 'resolved'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS mediations_invite_code_idx
  ON public.mediations(invite_code)
  WHERE invite_code IS NOT NULL;
