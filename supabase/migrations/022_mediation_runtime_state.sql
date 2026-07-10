-- Phase UI-B.1a: mediator-runtime state persistence on live mediations.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediation_state JSONB;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS session_memory JSONB;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_engine_version TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_runtime_metadata JSONB;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_last_goal TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_last_strategy TEXT;
ALTER TABLE public.mediations ADD COLUMN IF NOT EXISTS mediator_last_safety_level TEXT;

COMMENT ON COLUMN public.mediations.mediation_state IS
  'Serialized MediationState (v2.3) between live mediator-runtime turns.';
COMMENT ON COLUMN public.mediations.session_memory IS
  'Serialized SessionMemory (v2.3) between live mediator-runtime turns.';
COMMENT ON COLUMN public.mediations.mediator_engine_version IS
  'Engine path/version used for the live session (e.g. legacy, v2.3).';
COMMENT ON COLUMN public.mediations.mediator_runtime_metadata IS
  'Opaque runtime rollout metadata (turn counters, provider ids, etc.).';
COMMENT ON COLUMN public.mediations.mediator_last_goal IS
  'Denormalized last therapeutic goal for quick UI/session reads.';
COMMENT ON COLUMN public.mediations.mediator_last_strategy IS
  'Denormalized last therapeutic strategy for quick UI/session reads.';
COMMENT ON COLUMN public.mediations.mediator_last_safety_level IS
  'Denormalized last safety level for quick UI/session reads.';
