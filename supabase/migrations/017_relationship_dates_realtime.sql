-- Upewnij się, że współdzielone daty związku istnieją i synchronizują się w czasie rzeczywistym.

-- 1) Kolumny (idempotentnie — gdyby migracja 011 nie została wcześniej wdrożona).
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS relationship_start_date DATE,
  ADD COLUMN IF NOT EXISTS anniversaries JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) Pełny obraz wiersza w zdarzeniach realtime (potrzebny do payload.new przy UPDATE).
ALTER TABLE public.couples REPLICA IDENTITY FULL;

-- 3) Dołącz tabelę do publikacji realtime, jeśli jeszcze jej tam nie ma.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couples'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
  END IF;
END;
$$;
