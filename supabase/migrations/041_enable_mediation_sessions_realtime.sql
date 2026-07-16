DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mediation_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.mediation_sessions;
  END IF;
END
$$;
