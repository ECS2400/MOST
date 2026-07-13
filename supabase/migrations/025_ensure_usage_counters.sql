-- Repair: ensure freemium usage tables exist (required by check-limits edge function).
-- Safe to run when 019_usage_counters.sql was never applied to the remote project.

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('user', 'couple')),
  scope_id uuid NOT NULL,
  feature text NOT NULL,
  period text NOT NULL,
  used_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, feature, period)
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('user', 'couple')),
  scope_id uuid NOT NULL,
  feature text NOT NULL,
  usage_key text NOT NULL,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, feature, usage_key, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_scope_period
  ON public.usage_counters (scope_type, scope_id, feature, period);

CREATE INDEX IF NOT EXISTS idx_usage_events_scope_period
  ON public.usage_events (scope_type, scope_id, feature, period);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage counters" ON public.usage_counters;
CREATE POLICY "Users read own usage counters"
  ON public.usage_counters
  FOR SELECT
  TO authenticated
  USING (
    (scope_type = 'user' AND scope_id = auth.uid())
    OR (
      scope_type = 'couple'
      AND EXISTS (
        SELECT 1
        FROM public.couples c
        WHERE c.id = scope_id
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users read own usage events" ON public.usage_events;
CREATE POLICY "Users read own usage events"
  ON public.usage_events
  FOR SELECT
  TO authenticated
  USING (
    (scope_type = 'user' AND scope_id = auth.uid())
    OR (
      scope_type = 'couple'
      AND EXISTS (
        SELECT 1
        FROM public.couples c
        WHERE c.id = scope_id
          AND (c.partner_1_id = auth.uid() OR c.partner_2_id = auth.uid())
      )
    )
  );
