/** Canonical conflict category slugs persisted on public.mediations.conflict_category. */
export const CONFLICT_CATEGORIES = [
  'money',
  'chores',
  'communication',
  'trust',
  'jealousy',
  'intimacy',
  'family',
  'parenting',
  'time',
  'other',
] as const;

export type ConflictCategory = (typeof CONFLICT_CATEGORIES)[number];

export function isConflictCategory(value: unknown): value is ConflictCategory {
  return (
    typeof value === 'string' &&
    (CONFLICT_CATEGORIES as readonly string[]).includes(value)
  );
}
