import type {
  ActionType,
  MediationTurnV2Request,
  VoteValue,
} from './types.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION_TYPES: ReadonlySet<string> = new Set([
  'LOAD_SESSION',
  'CONTINUE',
  'VOTE',
  'FINISH',
  'CLOSE',
  'RETRY',
]);

const VOTE_VALUES: ReadonlySet<string> = new Set(['yes', 'no', 'stubborn']);

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Accept bootstrap OR session action contract. Extra keys ignored.
 */
export function parseTurnRequest(
  body: unknown
): { ok: true; value: MediationTurnV2Request } | { ok: false } {
  if (!body || typeof body !== 'object') return { ok: false };
  const record = body as Record<string, unknown>;

  // Bootstrap create/resume by mediationId
  if (record.action === 'START_OR_RESUME') {
    if (!isUuid(record.mediationId)) return { ok: false };
    if (!isUuid(record.requestId)) return { ok: false };
    return {
      ok: true,
      value: {
        kind: 'bootstrap',
        mediationId: record.mediationId,
        requestId: record.requestId,
        action: 'START_OR_RESUME',
      },
    };
  }

  if (!isUuid(record.sessionId)) return { ok: false };
  if (!isUuid(record.requestId)) return { ok: false };
  if (!record.action || typeof record.action !== 'object' || Array.isArray(record.action)) {
    return { ok: false };
  }

  const action = record.action as Record<string, unknown>;
  if (typeof action.type !== 'string' || !ACTION_TYPES.has(action.type)) {
    return { ok: false };
  }

  const optionId =
    action.optionId === null || action.optionId === undefined
      ? null
      : typeof action.optionId === 'string'
        ? action.optionId
        : null;
  if (action.optionId !== undefined && action.optionId !== null && optionId === null) {
    return { ok: false };
  }
  if (optionId !== null && (optionId.length < 1 || optionId.length > 64)) {
    return { ok: false };
  }

  let voteValue: VoteValue | null = null;
  if (action.voteValue === null || action.voteValue === undefined) {
    voteValue = null;
  } else if (typeof action.voteValue === 'string' && VOTE_VALUES.has(action.voteValue)) {
    voteValue = action.voteValue as VoteValue;
  } else {
    return { ok: false };
  }

  if (action.type === 'VOTE') {
    const hasOption = optionId !== null;
    const hasVote = voteValue !== null;
    if (hasOption === hasVote) return { ok: false };
  }

  return {
    ok: true,
    value: {
      kind: 'session',
      sessionId: record.sessionId,
      requestId: record.requestId,
      action: {
        type: action.type as ActionType,
        optionId,
        voteValue,
      },
    },
  };
}

/** @deprecated Use parseTurnRequest */
export function parseBootstrapRequest(
  body: unknown
): { ok: true; value: Extract<MediationTurnV2Request, { kind: 'bootstrap' }> } | { ok: false } {
  const parsed = parseTurnRequest(body);
  if (!parsed.ok || parsed.value.kind !== 'bootstrap') return { ok: false };
  return { ok: true, value: parsed.value };
}
