import type { MediationSessionRow, MediationTurnV2Response } from './types.ts';

export type SummaryBootstrapCase =
  | { kind: 'generate' }
  | { kind: 'resume'; summaryText: string }
  | { kind: 'unsupported' };

export function readSummaryText(
  sessionPayload: Record<string, unknown> | null | undefined
): string | null {
  if (!sessionPayload || typeof sessionPayload !== 'object') return null;
  const value = sessionPayload.summary;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Classify SUMMARY bootstrap handling. Does not mutate or repair state.
 */
export function classifySummaryBootstrap(
  session: MediationSessionRow
): SummaryBootstrapCase {
  if (session.current_screen !== 'SUMMARY') {
    return { kind: 'unsupported' };
  }

  const summaryText = readSummaryText(session.session_payload);
  const status = session.generation_status;
  const kind = session.last_generation_kind;

  if (
    status === 'GENERATING_CONTENT' &&
    kind === 'SUMMARY' &&
    summaryText === null
  ) {
    return { kind: 'generate' };
  }

  if (status === 'IDLE' && kind === 'SUMMARY' && summaryText !== null) {
    return { kind: 'resume', summaryText };
  }

  return { kind: 'unsupported' };
}

export function buildSummaryResponse(input: {
  sessionId: string;
  sessionVersion: number;
  summaryText: string;
  replayed: boolean;
}): MediationTurnV2Response {
  return {
    sessionId: input.sessionId,
    sessionVersion: input.sessionVersion,
    screen: 'SUMMARY',
    generationStatus: 'IDLE',
    content: {
      summary: {
        text: input.summaryText,
      },
    },
    replayed: input.replayed,
  };
}

export function isPublicSummaryResponse(
  value: unknown
): value is MediationTurnV2Response {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.sessionId !== 'string') return false;
  if (typeof r.sessionVersion !== 'number') return false;
  if (r.screen !== 'SUMMARY') return false;
  if (r.generationStatus !== 'IDLE') return false;
  if (typeof r.replayed !== 'boolean') return false;
  if (!r.content || typeof r.content !== 'object' || Array.isArray(r.content)) {
    return false;
  }
  const content = r.content as Record<string, unknown>;
  if (
    !content.summary ||
    typeof content.summary !== 'object' ||
    Array.isArray(content.summary)
  ) {
    return false;
  }
  const summary = content.summary as Record<string, unknown>;
  return typeof summary.text === 'string' && summary.text.trim().length > 0;
}

export function withSummaryOnPayload(
  currentPayload: Record<string, unknown>,
  summaryText: string
): Record<string, unknown> {
  return {
    ...currentPayload,
    summary: summaryText,
  };
}
