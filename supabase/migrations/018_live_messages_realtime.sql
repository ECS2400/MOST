-- Realtime dla live mediacji: natychmiastowa synchronizacja wiadomości i sesji między partnerami.

ALTER TABLE public.live_messages REPLICA IDENTITY FULL;
ALTER TABLE public.mediations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mediations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mediations;
  END IF;
END;
$$;
