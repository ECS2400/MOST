-- RevenueCat webhook idempotency log
CREATE TABLE IF NOT EXISTS public.revenuecat_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  app_user_id UUID,
  product_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.revenuecat_events ENABLE ROW LEVEL SECURITY;

-- Service role only — no client access
CREATE POLICY revenuecat_events_service_only ON public.revenuecat_events
  FOR ALL
  USING (false)
  WITH CHECK (false);
