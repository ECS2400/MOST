/** Appends an item and trims oldest entries when the list exceeds max length. */
export function appendLimited<T>(list: readonly T[], item: T, max: number): T[] {
  const next = [...list, item];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}

/** Prepends an item and trims oldest entries when the list exceeds max length. */
export function prependLimited<T>(list: readonly T[], item: T, max: number): T[] {
  const next = [item, ...list.filter((entry) => entry !== item)];
  if (next.length <= max) return next;
  return next.slice(0, max);
}

/** Appends only when absent; re-appends at end when duplicate to preserve recency. */
export function dedupeAppendLimited<T>(list: readonly T[], item: T, max: number): T[] {
  const without = list.filter((entry) => entry !== item);
  return appendLimited(without, item, max);
}
