-- Stable couple invite code per user (stored on profile, not regenerated each visit)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT;
