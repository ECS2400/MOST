-- Invite & live mediation fields
ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS partner_joined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_joined_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS mediations_invite_code_idx
  ON public.mediations(invite_code)
  WHERE invite_code IS NOT NULL;

ALTER TABLE public.mediations DROP CONSTRAINT IF EXISTS mediations_status_check;
ALTER TABLE public.mediations ADD CONSTRAINT mediations_status_check
  CHECK (status IN (
    'pending', 'analyzing', 'completed', 'failed',
    'cancelled', 'inviting', 'live'
  ));
