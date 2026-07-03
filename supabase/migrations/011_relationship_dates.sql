-- Data początku związku i rocznice pary (współdzielone między partnerami)
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS relationship_start_date DATE,
  ADD COLUMN IF NOT EXISTS anniversaries JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.couples.relationship_start_date IS 'Data rozpoczęcia związku — licznik dni razem';
COMMENT ON COLUMN public.couples.anniversaries IS 'Tablica {id, label, date} — np. ślub, pierwsza randka';
