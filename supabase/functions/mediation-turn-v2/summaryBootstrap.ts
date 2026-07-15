import type { MediationSessionRow } from './types.ts';
import { readSummaryText } from './payload.ts';

export type SummaryBootstrapCase =
  | { kind: 'generate' }
  | { kind: 'resume'; summaryText: string }
  | { kind: 'unsupported' };

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

export { readSummaryText, withSummaryOnPayload } from './payload.ts';
