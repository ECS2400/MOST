import type {
  EasyChoiceRound,
  MediationSessionRow,
  MediationTurnV2Response,
} from './types.ts';

export type EasyChoicesBootstrapCase =
  | { kind: 'generate' }
  | { kind: 'resume'; rounds: EasyChoiceRound[]; currentRound: number }
  | { kind: 'unsupported' };

function isEasyChoiceRound(value: unknown): value is EasyChoiceRound {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== 'string' || row.title.trim().length < 1) return false;
  if (!Array.isArray(row.choices) || row.choices.length < 1) return false;
  return row.choices.every(
    (choice) => typeof choice === 'string' && choice.trim().length > 0
  );
}

export function readEasyChoiceRounds(
  sessionPayload: Record<string, unknown> | null | undefined
): EasyChoiceRound[] | null {
  if (!sessionPayload || typeof sessionPayload !== 'object') return null;
  const easyChoices = sessionPayload.easyChoices;
  if (!easyChoices || typeof easyChoices !== 'object' || Array.isArray(easyChoices)) {
    return null;
  }
  const rounds = (easyChoices as Record<string, unknown>).rounds;
  if (!Array.isArray(rounds) || rounds.length < 1) return null;
  if (!rounds.every(isEasyChoiceRound)) return null;
  return rounds.map((round) => ({
    title: round.title.trim(),
    choices: round.choices.map((choice) => choice.trim()),
  }));
}

export function readEasyChoicesCurrentRound(
  sessionPayload: Record<string, unknown> | null | undefined
): number {
  if (!sessionPayload || typeof sessionPayload !== 'object') return 0;
  const easyChoices = sessionPayload.easyChoices;
  if (!easyChoices || typeof easyChoices !== 'object' || Array.isArray(easyChoices)) {
    return 0;
  }
  const currentRound = (easyChoices as Record<string, unknown>).currentRound;
  return typeof currentRound === 'number' && Number.isFinite(currentRound)
    ? currentRound
    : 0;
}

/**
 * Classify EASY_CHOICES bootstrap. Does not mutate or repair state.
 * One screen = one claim = one Claude call (generation_kind EASY_CHOICES).
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
    rounds === null
  ) {
    return { kind: 'generate' };
  }

  if (status === 'IDLE' && rounds !== null) {
    return {
      kind: 'resume',
      rounds,
      currentRound: readEasyChoicesCurrentRound(session.session_payload),
    };
  }

  return { kind: 'unsupported' };
}

export function buildEasyChoicesResponse(input: {
  sessionId: string;
  sessionVersion: number;
  rounds: EasyChoiceRound[];
  currentRound: number;
  replayed: boolean;
}): MediationTurnV2Response {
  return {
    sessionId: input.sessionId,
    sessionVersion: input.sessionVersion,
    screen: 'EASY_CHOICES',
    generationStatus: 'IDLE',
    content: {
      easyChoices: {
        rounds: input.rounds,
        currentRound: input.currentRound,
      },
    },
    replayed: input.replayed,
  };
}

export function isPublicEasyChoicesResponse(
  value: unknown
): value is Extract<MediationTurnV2Response, { screen: 'EASY_CHOICES' }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.sessionId !== 'string') return false;
  if (typeof r.sessionVersion !== 'number') return false;
  if (r.screen !== 'EASY_CHOICES') return false;
  if (r.generationStatus !== 'IDLE') return false;
  if (typeof r.replayed !== 'boolean') return false;
  if (!r.content || typeof r.content !== 'object' || Array.isArray(r.content)) {
    return false;
  }
  const content = r.content as Record<string, unknown>;
  if (
    !content.easyChoices ||
    typeof content.easyChoices !== 'object' ||
    Array.isArray(content.easyChoices)
  ) {
    return false;
  }
  const easyChoices = content.easyChoices as Record<string, unknown>;
  if (typeof easyChoices.currentRound !== 'number') return false;
  if (!Array.isArray(easyChoices.rounds)) return false;
  return easyChoices.rounds.every(isEasyChoiceRound);
}

export function withEasyChoicesRoundsOnPayload(
  currentPayload: Record<string, unknown>,
  rounds: EasyChoiceRound[]
): Record<string, unknown> {
  const existing = currentPayload.easyChoices;
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {
          rounds: [],
          answers: { HOST: {}, PARTNER: {} },
          currentRound: 0,
        };

  return {
    ...currentPayload,
    easyChoices: {
      ...base,
      rounds,
    },
  };
}
