-- Etap 2B: canonical conflict category on public.mediations (host-selected at intake).
-- Legacy rows remain NULL; Runtime V2 must not start without a non-empty slug.

ALTER TABLE public.mediations
  ADD COLUMN conflict_category text;

ALTER TABLE public.mediations
  ADD CONSTRAINT mediations_conflict_category_allowed
  CHECK (
    conflict_category IS NULL
    OR conflict_category IN (
      'money',
      'chores',
      'communication',
      'trust',
      'jealousy',
      'intimacy',
      'family',
      'parenting',
      'time',
      'other'
    )
  );

COMMENT ON COLUMN public.mediations.conflict_category IS
  'Canonical conflict category slug selected by the host at intake. Used by Mediation Runtime V2 and exclusion history. NULL allowed only for legacy rows.';
