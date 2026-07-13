/** Normalizes expo-router search params that may be string or string[]. */
export function normalizeRouteParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
    return first?.trim();
  }
  return undefined;
}
