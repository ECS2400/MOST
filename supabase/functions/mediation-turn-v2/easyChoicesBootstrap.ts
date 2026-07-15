import type { EasyChoiceRound, MediationSessionRow } from './types.ts';
import {
  readCurrentRound,
  readEasyChoicesRounds,
  withEasyChoicesRoundsOnPayload,
} from './payload.ts';

export type EasyChoicesBootstrapCase =
  | { kind: 'generate' }
  | { kind: 'resume'; rounds: EasyChoiceRound[]; currentRound: number }
  | { kind: 'unsupported' };

export function readEasyChoiceRounds(
  sessionPayload: Record<string, unknown> | null | undefined
): EasyChoiceRound[] | null {
  if (!sessionPayload) return null;
  const rounds = readEasyChoicesRounds(sessionPayload);
  if (!rounds || rounds.length < 1) return null;
  return rounds.map((r) => ({
    title: r.question,
    choices: r.options.map((o) => o.label),
  }));
}

export function readEasyChoicesCurrentRound(
  sessionPayload: Record<string, unknown> | null | undefined
): number {
  if (!sessionPayload) return 0;
  return readCurrentRound(sessionPayload);
}

/**
 * Classify EASY_CHOICES bootstrap. Does not mutate or repair state.
 */
export function classifyEasyChoicesBootstrap(
  session: MediationSessionRow
): EasyChoicesBootstrapCase {
  if (session.current_screen !== 'EASY_CHOICES') {
    return { kind: 'unsupported' };
  }

  const rounds = readEasyChoiceRounds(session.session_payload);
  const status = session.generation_status;
  const kind = session.last_generation_kind;

  if (
    status === 'GENERATING_CONTENT' &&
    kind === 'EASY_CHOICES' &&
    (rounds === null || rounds.length < 5)
  ) {
    return { kind: 'generate' };
  }

  if (status === 'IDLE' && rounds !== null && rounds.length >= 5) {
    return {
      kind: 'resume',
      rounds,
      currentRound: readEasyChoicesCurrentRound(session.session_payload),
    };
  }

  return { kind: 'unsupported' };
}

export { withEasyChoicesRoundsOnPayload };
