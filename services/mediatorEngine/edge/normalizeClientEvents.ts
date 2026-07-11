import type {
  RuntimeClientEvent,
  RuntimeClientEventKind,
} from '@/types/mediator';

const CLIENT_EVENT_KINDS: ReadonlySet<RuntimeClientEventKind> = new Set([
  'host_message',
  'partner_message',
  'continue_session',
  'resolve_session',
  'start_extension',
  'proposal_accepted',
  'proposal_rejected',
]);

export const MAX_CLIENT_EVENTS = 20;

/** Shared runtime contract check for a single client event payload. */
export function isValidRuntimeClientEvent(value: unknown): value is RuntimeClientEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.kind !== 'string' ||
    !CLIENT_EVENT_KINDS.has(raw.kind as RuntimeClientEventKind)
  ) {
    return false;
  }

  if (raw.actor !== 'host' && raw.actor !== 'partner') {
    return false;
  }

  if (typeof raw.at !== 'string' || raw.at.trim().length === 0) {
    return false;
  }

  if (
    raw.metadata !== undefined &&
    (raw.metadata === null || typeof raw.metadata !== 'object' || Array.isArray(raw.metadata))
  ) {
    return false;
  }

  return true;
}

function toRuntimeClientEvent(value: unknown): RuntimeClientEvent | null {
  if (!isValidRuntimeClientEvent(value)) {
    return null;
  }

  const raw = value as RuntimeClientEvent;

  return {
    kind: raw.kind,
    actor: raw.actor,
    at: raw.at.trim(),
    ...(raw.metadata !== undefined ? { metadata: raw.metadata } : {}),
  };
}

function validateClientEventsArray(value: unknown): RuntimeClientEvent[] | 'invalid' {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    return 'invalid';
  }

  if (value.length > MAX_CLIENT_EVENTS) {
    return 'invalid';
  }

  const result: RuntimeClientEvent[] = [];

  for (const entry of value) {
    const parsed = toRuntimeClientEvent(entry);
    if (!parsed) {
      return 'invalid';
    }
    result.push(parsed);
  }

  return result;
}

/**
 * Validates and normalizes a clientEvents array.
 * Returns `'invalid'` when the field is present but fails strict validation.
 */
export function normalizeClientEvents(value: unknown): RuntimeClientEvent[] | 'invalid' {
  return validateClientEventsArray(value);
}

/**
 * Parses clientEvents from an Edge request body.
 * Alias of {@link normalizeClientEvents} — same strict, atomic contract.
 */
export function parseClientEventsFromRequest(
  value: unknown
): RuntimeClientEvent[] | 'invalid' {
  return normalizeClientEvents(value);
}
