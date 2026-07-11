-- Phase UI-B.3b.4: persist last RuntimeSession contract on live mediations.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_runtime_session JSONB;

COMMENT ON COLUMN public.mediations.mediator_runtime_session IS
  'Last serialized RuntimeSession (v2.3 UI flow contract) from mediator-runtime.';
