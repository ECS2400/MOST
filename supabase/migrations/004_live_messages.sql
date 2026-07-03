-- Live mediation messages & session state
ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS live_phase INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS live_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_question TEXT,
  ADD COLUMN IF NOT EXISTS partner_typing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_summary JSONB;

CREATE TABLE IF NOT EXISTS public.live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id UUID NOT NULL REFERENCES public.mediations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message'
    CHECK (message_type IN ('message', 'question', 'hint', 'system', 'summary')),
  is_private BOOLEAN NOT NULL DEFAULT false,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_messages_mediation_id_idx
  ON public.live_messages(mediation_id, created_at);

ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view live messages"
  ON public.live_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mediations m
      WHERE m.id = live_messages.mediation_id
        AND (m.user_id = auth.uid() OR m.partner_id = auth.uid())
    )
    AND (
      is_private = false
      OR recipient_id = auth.uid()
      OR sender_id = auth.uid()::text
    )
  );

CREATE POLICY "Participants can send live messages"
  ON public.live_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mediations m
      WHERE m.id = live_messages.mediation_id
        AND (m.user_id = auth.uid() OR m.partner_id = auth.uid())
    )
    AND (
      sender_id = auth.uid()::text
      OR sender_id = 'ai'
    )
  );

CREATE POLICY "Participants can update mediation session"
  ON public.mediations FOR UPDATE
  USING (user_id = auth.uid() OR partner_id = auth.uid());
