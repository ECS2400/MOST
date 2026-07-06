import type {
  LegacyShadowComparable,
  RuntimeShadowComparable,
  ShadowComparisonResult,
  ShadowFieldComparison,
} from '@/services/mediatorShadow/types';

const COMPARABLE_FIELDS: Array<keyof RuntimeShadowComparable> = [
  'accepted',
  'validationAction',
  'language',
  'safetyLevel',
  'providerId',
  'retryCount',
  'fallbackUsed',
  'latencyMs',
];

function valuesMatch(
  field: keyof RuntimeShadowComparable,
  legacyValue: unknown,
  runtimeValue: unknown
): boolean | null {
  if (legacyValue === undefined || legacyValue === null) return null;
  if (runtimeValue === undefined || runtimeValue === null) return null;

  if (field === 'latencyMs') {
    if (typeof legacyValue !== 'number' || typeof runtimeValue !== 'number') return null;
    return Math.abs(legacyValue - runtimeValue) <= 50;
  }

  return legacyValue === runtimeValue;
}

/**
 * Compares legacy vs runtime shadow snapshots on non-text fields only.
 * Returns null match when legacy has no comparable value.
 */
export function compareShadowResponses(
  legacy: LegacyShadowComparable,
  runtime: RuntimeShadowComparable
): ShadowComparisonResult {
  const fields: ShadowFieldComparison[] = COMPARABLE_FIELDS.map((field) => ({
    field,
    match: valuesMatch(field, legacy[field], runtime[field]),
  }));

  const comparable = fields.filter((entry) => entry.match !== null);
  const matchCount = comparable.filter((entry) => entry.match === true).length;

  return {
    fields,
    comparableCount: comparable.length,
    matchCount,
  };
}

/** Maps legacy live response source to runtime source when comparable. */
export function buildLegacyShadowComparable(
  legacy: { source?: string },
  options: { language?: LegacyShadowComparable['language']; latencyMs?: number } = {}
): LegacyShadowComparable {
  const snapshot: LegacyShadowComparable = {};

  if (options.language) snapshot.language = options.language;
  if (options.latencyMs !== undefined) snapshot.latencyMs = options.latencyMs;

  if (legacy.source === 'llm' || legacy.source === 'fallback' || legacy.source === 'stub') {
    snapshot.source = legacy.source;
  } else if (legacy.source) {
    snapshot.source = legacy.source;
  }

  return snapshot;
}
