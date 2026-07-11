import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Minimal structural guard for persisted or parsed RuntimeSession payloads. */
export function isRuntimeSessionShape(value: unknown): value is RuntimeSession {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.decision) &&
    isRecord(value.session) &&
    isRecord(value.progress) &&
    isRecord(value.presentation) &&
    isRecord(value.proposal) &&
    isRecord(value.closure) &&
    isRecord(value.pending) &&
    isRecord(value.diagnostics)
  );
}
