import type { MediatorRuntimeParsedSuccess } from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';
import {
  isMediatorRuntimeClientError,
  type MediatorRuntimeClientErrorKind,
} from '@/services/mediatorRuntimeClient/errors';
import type { RuntimeShadowComparable, ShadowMetric } from '@/services/mediatorShadow/types';

export function createShadowTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/** Builds sanitized metric from successful runtime shadow call. */
export function buildShadowSuccessMetric(
  parsed: MediatorRuntimeParsedSuccess,
  startedAtMs: number,
  timestamp: string = createShadowTimestamp()
): ShadowMetric {
  const { runtime } = parsed;
  const message = runtime.finalMediatorMessage;

  return {
    timestamp,
    outcome: 'success',
    engineVersion: runtime.engineVersion,
    providerId: runtime.runtimeMetadata.providerId,
    latencyMs: runtime.runtimeMetadata.durationMs,
    accepted: message.accepted,
    validationAction: message.validationAction,
    retryCount: runtime.retryCount,
    fallbackUsed: runtime.fallbackUsed,
    compliant: runtime.complianceResult.compliant,
    language: message.language,
    safetyLevel: message.safetyLevel,
    source: message.source,
  };
}

/** Builds sanitized metric for shadow timeout. */
export function buildShadowTimeoutMetric(
  startedAtMs: number,
  timestamp: string = createShadowTimestamp()
): ShadowMetric {
  return {
    timestamp,
    outcome: 'timeout',
    errorKind: 'timeout',
    latencyMs: Math.max(0, Date.now() - startedAtMs),
  };
}

/** Builds sanitized metric for shadow runtime failure. */
export function buildShadowFailureMetric(
  error: unknown,
  startedAtMs: number,
  timestamp: string = createShadowTimestamp()
): ShadowMetric {
  const errorKind: MediatorRuntimeClientErrorKind | 'unknown' = isMediatorRuntimeClientError(error)
    ? error.kind
    : 'unknown';

  const metric: ShadowMetric = {
    timestamp,
    outcome: 'failure',
    errorKind,
    latencyMs: Math.max(0, Date.now() - startedAtMs),
  };

  if (isMediatorRuntimeClientError(error) && error.details.status !== undefined) {
    metric.status = error.details.status;
  }

  return metric;
}

/** Extracts comparable runtime fields — no transcript or prompts. */
export function extractRuntimeShadowComparable(
  parsed: MediatorRuntimeParsedSuccess
): RuntimeShadowComparable {
  const { runtime } = parsed;
  const message = runtime.finalMediatorMessage;

  return {
    accepted: message.accepted,
    validationAction: message.validationAction,
    language: message.language,
    safetyLevel: message.safetyLevel,
    providerId: runtime.runtimeMetadata.providerId,
    retryCount: runtime.retryCount,
    fallbackUsed: runtime.fallbackUsed,
    latencyMs: runtime.runtimeMetadata.durationMs,
    source: message.source,
  };
}

/** Returns true when serialized metric contains no forbidden content markers. */
export function isShadowMetricSafe(metric: ShadowMetric): boolean {
  const serialized = JSON.stringify(metric);
  const forbidden = [
    'transcript',
    'prompt',
    'systemPrompt',
    'userPrompt',
    'publicMessage',
    'aiQuestion',
    'email',
    'phone',
    '@',
  ];
  const lower = serialized.toLowerCase();
  return !forbidden.some((term) => lower.includes(term));
}
