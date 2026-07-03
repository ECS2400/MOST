-- Summary / resolution statuses for mediations
ALTER TABLE public.mediations DROP CONSTRAINT IF EXISTS mediations_status_check;
ALTER TABLE public.mediations ADD CONSTRAINT mediations_status_check
  CHECK (status IN (
    'pending', 'analyzing', 'completed', 'failed',
    'cancelled', 'inviting', 'live',
    'pending_agreements', 'resolved'
  ));
