-- Prevent host and partner being the same user on mediations.
-- Existing broken rows are reported, not rewritten — validate after manual cleanup.
--
-- Report broken rows:
--   SELECT id, user_id, partner_id, status, created_at
--   FROM public.mediations
--   WHERE partner_id IS NOT NULL AND partner_id = user_id;

ALTER TABLE public.mediations
  DROP CONSTRAINT IF EXISTS mediations_partner_not_host_check;

ALTER TABLE public.mediations
  ADD CONSTRAINT mediations_partner_not_host_check
  CHECK (partner_id IS NULL OR partner_id <> user_id)
  NOT VALID;

COMMENT ON CONSTRAINT mediations_partner_not_host_check ON public.mediations IS
  'partner_id must refer to a distinct user from user_id (host).';
