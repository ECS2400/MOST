-- Optional timestamp for when both partners joined (used by connect RPC)
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;
