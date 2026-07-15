import type { MediationTurnV2BootstrapRequest } from './types.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Accept only the bootstrap contract. Extra keys are ignored (never used).
 */
export function parseBootstrapRequest(
  body: unknown
): { ok: true; value: MediationTurnV2BootstrapRequest } | { ok: false } {
  if (!body || typeof body !== 'object') return { ok: false };
  const record = body as Record<string, unknown>;

  if (!isUuid(record.mediationId)) return { ok: false };
  if (!isUuid(record.requestId)) return { ok: false };
  if (record.action !== 'START_OR_RESUME') return { ok: false };

  return {
    ok: true,
    value: {
      mediationId: record.mediationId,
      requestId: record.requestId,
      action: 'START_OR_RESUME',
    },
  };
}
