import { AppError } from './errors.ts';
import {
  bothAnsweredRound,
  bothFirstDealVoted,
  getEasyChoiceAnswer,
  getFirstDealVote,
  isConfirmed,
  partnerOf,
  readCurrentRound,
  readEasyChoicesRounds,
  resolveFirstDealOutcome,
  setConfirmation,
  setEasyChoiceAnswer,
  setEasyChoicesCurrentRound,
  setFirstDealVote,
  withAgreementFromFirstDeal,
} from './payload.ts';
import type {
  GenerationKind,
  MediationScreen,
  MediationSessionRow,
  MediationTurnV2SessionRequest,
  Talker,
  VoteValue,
} from './types.ts';

export type TransitionResult = {
  nextScreen: MediationScreen;
  sessionPayload: Record<string, unknown>;
  generationStatus: string;
  lastGenerationKind: GenerationKind | null;
  progressTotal: number;
  /** After commit, run claim→Claude for this kind (same request). */
  kickoffGeneration: GenerationKind | null;
};

function requireIdle(session: MediationSessionRow): void {
  if (session.generation_status !== 'IDLE') {
    throw new AppError('INVALID_TRANSITION', 409, 'not_idle');
  }
}

function alreadyConfirmed(
  payload: Record<string, unknown>,
  screen: 'SUMMARY' | 'COMPROMISE' | 'LESSON' | 'DATE',
  talker: Talker
): never {
  throw new AppError('DUPLICATE_ACTION', 409, `${screen}_already_confirmed`);
}

/**
 * Deterministic Case A/B transitions (State Machine). Builds next payload;
 * caller commits via commit_mediation_action.
 */
export function applyUserTransition(input: {
  session: MediationSessionRow;
  talker: Talker;
  action: MediationTurnV2SessionRequest['action'];
}): TransitionResult {
  const screen = input.session.current_screen as MediationScreen;
  const payload = input.session.session_payload;
  const talker = input.talker;
  const partner = partnerOf(talker);
  const action = input.action;
  const progressTotal = input.session.progress_total || 6;
  const lastKind = input.session.last_generation_kind as GenerationKind | null;

  // RETRY handled separately
  if (action.type === 'RETRY') {
    throw new AppError('INVALID_TRANSITION', 409, 'retry_via_handler');
  }

  if (action.type === 'LOAD_SESSION') {
    throw new AppError('INVALID_TRANSITION', 409, 'load_via_handler');
  }

  requireIdle(input.session);

  // ─── SUMMARY CONTINUE (T10/T11) ───────────────────────────────────────────
  if (screen === 'SUMMARY') {
    if (action.type !== 'CONTINUE') {
      throw new AppError('INVALID_TRANSITION', 409, 'summary_action');
    }
    if (isConfirmed(payload, 'SUMMARY', talker)) {
      alreadyConfirmed(payload, 'SUMMARY', talker);
    }
    let next = setConfirmation(payload, 'SUMMARY', talker);
    if (!isConfirmed(next, 'SUMMARY', partner)) {
      // Case A T10
      return {
        nextScreen: 'SUMMARY',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }
    // Case B T11 → EASY_CHOICES; kick EASY_CHOICES gen if rounds missing (038 split)
    next = setEasyChoicesCurrentRound(next, 1);
    const hasRounds = (readEasyChoicesRounds(next)?.length ?? 0) >= 5;
    return {
      nextScreen: 'EASY_CHOICES',
      sessionPayload: next,
      generationStatus: hasRounds ? 'IDLE' : 'GENERATING_CONTENT',
      lastGenerationKind: hasRounds ? lastKind : 'EASY_CHOICES',
      progressTotal,
      kickoffGeneration: hasRounds ? null : 'EASY_CHOICES',
    };
  }

  // ─── EASY_CHOICES VOTE (T20–T31) ──────────────────────────────────────────
  if (screen === 'EASY_CHOICES') {
    if (action.type !== 'VOTE' || !action.optionId) {
      throw new AppError('INVALID_TRANSITION', 409, 'easy_choices_action');
    }
    const round = readCurrentRound(payload);
    const rounds = readEasyChoicesRounds(payload);
    if (!rounds || rounds.length < 5) {
      throw new AppError('UNSUPPORTED_SESSION_STATE', 422, 'easy_choices_empty');
    }
    const current = rounds[round - 1];
    const validIds = new Set(current.options.map((o) => o.id));
    if (!validIds.has(action.optionId)) {
      throw new AppError('INVALID_REQUEST', 400, 'option_id');
    }
    if (bothAnsweredRound(payload, round)) {
      throw new AppError('INVALID_TRANSITION', 409, 'round_closed');
    }

    let next = setEasyChoiceAnswer(payload, talker, round, action.optionId);
    const partnerAnswered = getEasyChoiceAnswer(next, partner, round) !== null;

    if (!partnerAnswered) {
      // Case A T20/T30
      return {
        nextScreen: 'EASY_CHOICES',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }

    // Case B
    if (round < 5) {
      next = setEasyChoicesCurrentRound(next, round + 1);
      return {
        nextScreen: 'EASY_CHOICES',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }

    // T31 runda 5 → FIRST_DEAL generation
    return {
      nextScreen: 'EASY_CHOICES',
      sessionPayload: next,
      generationStatus: 'GENERATING_CONTENT',
      lastGenerationKind: 'FIRST_DEAL',
      progressTotal,
      kickoffGeneration: 'FIRST_DEAL',
    };
  }

  // ─── FIRST_DEAL VOTE (T40–T42) ────────────────────────────────────────────
  if (screen === 'FIRST_DEAL') {
    if (action.type !== 'VOTE' || !action.voteValue) {
      throw new AppError('INVALID_TRANSITION', 409, 'first_deal_action');
    }
    if (bothFirstDealVoted(payload)) {
      throw new AppError('INVALID_TRANSITION', 409, 'votes_closed');
    }
    let next = setFirstDealVote(payload, talker, action.voteValue as VoteValue);
    if (getFirstDealVote(next, partner) === null) {
      // Case A T40
      return {
        nextScreen: 'FIRST_DEAL',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }

    const outcome = resolveFirstDealOutcome(next);
    if (outcome === 'YES_YES') {
      next = withAgreementFromFirstDeal(next);
      return {
        nextScreen: 'FIRST_DEAL',
        sessionPayload: next,
        generationStatus: 'GENERATING_CONTENT',
        lastGenerationKind: 'LESSON',
        progressTotal: 6,
        kickoffGeneration: 'LESSON',
      };
    }
    return {
      nextScreen: 'FIRST_DEAL',
      sessionPayload: next,
      generationStatus: 'GENERATING_COMPROMISE',
      lastGenerationKind: 'COMPROMISE',
      progressTotal: 7,
      kickoffGeneration: 'COMPROMISE',
    };
  }

  // ─── COMPROMISE CONTINUE (T70/T71) ────────────────────────────────────────
  if (screen === 'COMPROMISE') {
    if (action.type !== 'CONTINUE') {
      throw new AppError('INVALID_TRANSITION', 409, 'compromise_action');
    }
    if (isConfirmed(payload, 'COMPROMISE', talker)) {
      alreadyConfirmed(payload, 'COMPROMISE', talker);
    }
    const next = setConfirmation(payload, 'COMPROMISE', talker);
    if (!isConfirmed(next, 'COMPROMISE', partner)) {
      return {
        nextScreen: 'COMPROMISE',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }
    // Case B T71 → LESSON (038: kind LESSON not LESSON_DATE)
    return {
      nextScreen: 'COMPROMISE',
      sessionPayload: next,
      generationStatus: 'GENERATING_CONTENT',
      lastGenerationKind: 'LESSON',
      progressTotal,
      kickoffGeneration: 'LESSON',
    };
  }

  // ─── LESSON CONTINUE (T80 / plan DATE kickoff) ────────────────────────────
  if (screen === 'LESSON') {
    if (action.type !== 'CONTINUE') {
      throw new AppError('INVALID_TRANSITION', 409, 'lesson_action');
    }
    if (isConfirmed(payload, 'LESSON', talker)) {
      alreadyConfirmed(payload, 'LESSON', talker);
    }
    const next = setConfirmation(payload, 'LESSON', talker);
    if (!isConfirmed(next, 'LESSON', partner)) {
      return {
        nextScreen: 'LESSON',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }
    // Plan: both CONTINUE → DATE + GENERATING + kind DATE
    return {
      nextScreen: 'DATE',
      sessionPayload: next,
      generationStatus: 'GENERATING_CONTENT',
      lastGenerationKind: 'DATE',
      progressTotal,
      kickoffGeneration: 'DATE',
    };
  }

  // ─── DATE FINISH (T90/T91) ────────────────────────────────────────────────
  if (screen === 'DATE') {
    if (action.type !== 'FINISH') {
      throw new AppError('INVALID_TRANSITION', 409, 'date_action');
    }
    if (isConfirmed(payload, 'DATE', talker)) {
      alreadyConfirmed(payload, 'DATE', talker);
    }
    const next = setConfirmation(payload, 'DATE', talker);
    if (!isConfirmed(next, 'DATE', partner)) {
      return {
        nextScreen: 'DATE',
        sessionPayload: next,
        generationStatus: 'IDLE',
        lastGenerationKind: lastKind,
        progressTotal,
        kickoffGeneration: null,
      };
    }
    return {
      nextScreen: 'END',
      sessionPayload: next,
      generationStatus: 'IDLE',
      lastGenerationKind: lastKind,
      progressTotal,
      kickoffGeneration: null,
    };
  }

  // ─── END CLOSE (T100) ─────────────────────────────────────────────────────
  if (screen === 'END') {
    if (action.type !== 'CLOSE') {
      throw new AppError('INVALID_TRANSITION', 409, 'end_action');
    }
    return {
      nextScreen: 'END',
      sessionPayload: payload,
      generationStatus: 'IDLE',
      lastGenerationKind: lastKind,
      progressTotal,
      kickoffGeneration: null,
    };
  }

  throw new AppError('UNSUPPORTED_SESSION_STATE', 422, 'unknown_screen');
}

export function retryTransition(input: {
  session: MediationSessionRow;
}): TransitionResult {
  if (input.session.generation_status !== 'FAILED') {
    throw new AppError('INVALID_TRANSITION', 409, 'retry_not_failed');
  }
  const kind = input.session.last_generation_kind as GenerationKind | null;
  if (!kind) {
    throw new AppError('INVALID_TRANSITION', 409, 'retry_no_kind');
  }

  const screen = input.session.current_screen as MediationScreen;
  const progressTotal = input.session.progress_total || 6;
  const genStatus =
    kind === 'COMPROMISE' ? 'GENERATING_COMPROMISE' : 'GENERATING_CONTENT';

  return {
    nextScreen: screen,
    sessionPayload: input.session.session_payload,
    generationStatus: genStatus,
    lastGenerationKind: kind,
    progressTotal,
    kickoffGeneration: kind,
  };
}
