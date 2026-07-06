import type { MediatorLang, SafetyLevel, ResponseValidationAction } from '@/types/mediator';
import type { MediatorRuntimeClientErrorKind } from '@/services/mediatorRuntimeClient/errors';

/** Outcome of a shadow mediator-runtime invocation. */
export type ShadowOutcome = 'success' | 'failure' | 'timeout';

/** Sanitized shadow metric — never contains transcript, prompts, or PII. */
export interface ShadowMetric {
  timestamp: string;
  outcome: ShadowOutcome;
  engineVersion?: string;
  providerId?: string;
  latencyMs?: number;
  accepted?: boolean;
  validationAction?: ResponseValidationAction;
  retryCount?: number;
  fallbackUsed?: boolean;
  compliant?: boolean;
  language?: MediatorLang;
  safetyLevel?: SafetyLevel;
  source?: 'llm' | 'fallback' | 'stub';
  errorKind?: MediatorRuntimeClientErrorKind | 'timeout' | 'unknown';
  status?: number;
}

/** Comparable runtime fields — no message text. */
export interface RuntimeShadowComparable {
  accepted?: boolean;
  validationAction?: ResponseValidationAction;
  language?: MediatorLang;
  safetyLevel?: SafetyLevel;
  providerId?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
  latencyMs?: number;
  source?: 'llm' | 'fallback' | 'stub';
}

/** Comparable legacy fields — no message text. */
export interface LegacyShadowComparable {
  source?: string;
  language?: MediatorLang;
  latencyMs?: number;
}

export interface ShadowFieldComparison {
  field: keyof RuntimeShadowComparable;
  match: boolean | null;
}

export interface ShadowComparisonResult {
  fields: ShadowFieldComparison[];
  comparableCount: number;
  matchCount: number;
}

export type ShadowMetricLogger = (metric: ShadowMetric) => void;
