-- Track which AI question to ask next (prevents repeating the same question)
ALTER TABLE public.mediations
  ADD COLUMN IF NOT EXISTS current_question_index INTEGER NOT NULL DEFAULT 0;
