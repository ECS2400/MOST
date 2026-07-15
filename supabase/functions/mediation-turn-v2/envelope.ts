import { AppError } from './errors.ts';
import {
  getEasyChoiceAnswer,
  getFirstDealVote,
  isConfirmed,
  readCurrentRound,
  readEasyChoicesRounds,
  readPublicEndAgreement,
  readSummaryText,
} from './payload.ts';
import type {
  EnvelopeAction,
  MediationScreen,
  MediationSessionRow,
  MediationTurnV2Envelope,
  Talker,
  VoteValue,
} from './types.ts';

const SCREEN_ORDER: Record<MediationScreen, number> = {
  SUMMARY: 1,
  EASY_CHOICES: 2,
  FIRST_DEAL: 3,
  COMPROMISE: 4,
  LESSON: 5,
  DATE: 6,
  END: 7,
};

const TITLES: Record<MediationScreen, string> = {
  SUMMARY: 'Podsumowanie',
  EASY_CHOICES: 'Łatwe wybory',
  FIRST_DEAL: 'Propozycja',
  COMPROMISE: 'Kompromis',
  LESSON: 'Lekcja',
  DATE: 'Randka',
  END: 'Koniec',
};

const SUBTITLES: Record<MediationScreen, string | null> = {
  SUMMARY: 'Czy dobrze rozumiemy spor?',
  EASY_CHOICES: 'Wybierzcie odpowiedzi runda po rundzie',
  FIRST_DEAL: 'Zagłosujcie na propozycję',
  COMPROMISE: 'Wspólne rozwiązanie',
  LESSON: 'Co wynieść ze sporu',
  DATE: 'Pomysł na wspólną chwilę',
  END: null,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function normalizeScreen(value: string): MediationScreen | null {
  if (
    value === 'SUMMARY' ||
    value === 'EASY_CHOICES' ||
    value === 'FIRST_DEAL' ||
    value === 'COMPROMISE' ||
    value === 'LESSON' ||
    value === 'DATE' ||
    value === 'END'
  ) {
    return value;
  }
  return null;
}

export function progressForScreen(
  screen: MediationScreen,
  progressTotal: number
): { current: number; total: number } {
  const order = SCREEN_ORDER[screen] ?? 1;
  // COMPROMISE path: progress_total=7; without COMPROMISE in YES+YES path total=6
  // Map LESSON/DATE/END indices for path without COMPROMISE
  if (progressTotal === 6 && order >= 4) {
    // Skip COMPROMISE slot: LESSON=4, DATE=5, END=6
    const remapped =
      screen === 'LESSON'
        ? 4
        : screen === 'DATE'
          ? 5
          : screen === 'END'
            ? 6
            : order;
    return { current: remapped, total: 6 };
  }
  return {
    current: order,
    total: progressTotal > 0 ? progressTotal : 6,
  };
}

function buildEasyChoices(
  payload: Record<string, unknown>,
  talker: Talker
): { content: Record<string, unknown>; actions: EnvelopeAction[] } {
  const rounds = readEasyChoicesRounds(payload) ?? [];
  const currentRound = readCurrentRound(payload);
  const round = rounds[currentRound - 1];
  const hostVote = getEasyChoiceAnswer(payload, 'HOST', currentRound);
  const partnerVote = getEasyChoiceAnswer(payload, 'PARTNER', currentRound);
  const myVote = getEasyChoiceAnswer(payload, talker, currentRound);

  let partnerStatus: 'waiting' | 'answered' | 'both_done' = 'waiting';
  if (hostVote && partnerVote) partnerStatus = 'both_done';
  else if (
    (talker === 'HOST' && partnerVote) ||
    (talker === 'PARTNER' && hostVote)
  ) {
    partnerStatus = 'answered';
  }

  const options = round?.options ?? [];
  const actions: EnvelopeAction[] = options.map((opt) => ({
    id: opt.id,
    type: 'VOTE',
    label: opt.label,
    voteValue: null,
    disabled: myVote !== null,
  }));

  return {
    content: {
      roundIndex: currentRound,
      totalRounds: 5,
      question: round?.question ?? '',
      options,
      partnerStatus,
    },
    actions,
  };
}

function buildFirstDealActions(
  payload: Record<string, unknown>,
  talker: Talker
): EnvelopeAction[] {
  const myVote = getFirstDealVote(payload, talker);
  const disabled = myVote !== null;
  const labels: Array<{ voteValue: VoteValue; label: string }> = [
    { voteValue: 'yes', label: 'Tak' },
    { voteValue: 'no', label: 'Nie' },
    { voteValue: 'stubborn', label: 'Uparty/a' },
  ];
  return labels.map((row) => ({
    id: `vote_${row.voteValue}`,
    type: 'VOTE',
    label: row.label,
    voteValue: row.voteValue,
    disabled,
  }));
}

export function buildEnvelope(input: {
  session: MediationSessionRow;
  talker: Talker;
  correlationId: string;
  replayed?: boolean;
  processing?: boolean;
  message?: string;
}): MediationTurnV2Envelope {
  const screen = normalizeScreen(input.session.current_screen) ?? 'SUMMARY';
  const payload = input.session.session_payload;
  const gen = input.session.generation_status;
  const failed = gen === 'FAILED';

  let content: Record<string, unknown> = {};
  let actions: EnvelopeAction[] = [];

  if (input.processing) {
    content = { status: 'processing' };
    actions = [];
  } else if (failed) {
    content = { status: 'failed' };
    actions = [
      {
        id: 'retry',
        type: 'RETRY',
        label: 'Spróbuj ponownie',
        voteValue: null,
      },
    ];
  } else if (screen === 'SUMMARY') {
    content = { summary: readSummaryText(payload) ?? '' };
    const done = isConfirmed(payload, 'SUMMARY', input.talker);
    actions = [
      {
        id: 'continue',
        type: 'CONTINUE',
        label: 'Dalej',
        voteValue: null,
        disabled: done,
      },
    ];
  } else if (screen === 'EASY_CHOICES') {
    const built = buildEasyChoices(payload, input.talker);
    content = built.content;
    actions = built.actions;
  } else if (screen === 'FIRST_DEAL') {
    const fd = asRecord(payload.firstDeal);
    content = {
      dealText: readString(fd?.dealText) ?? readString(fd?.text) ?? '',
    };
    actions = buildFirstDealActions(payload, input.talker);
  } else if (screen === 'COMPROMISE') {
    const c = asRecord(payload.compromise);
    content = {
      dealText: readString(c?.dealText) ?? '',
      whyItFitsBoth: readString(c?.whyItFitsBoth) ?? '',
    };
    const done = isConfirmed(payload, 'COMPROMISE', input.talker);
    actions = [
      {
        id: 'continue',
        type: 'CONTINUE',
        label: 'Dalej',
        voteValue: null,
        disabled: done,
      },
    ];
  } else if (screen === 'LESSON') {
    const lesson = asRecord(payload.lesson);
    content = {
      observation: readString(lesson?.observation) ?? '',
      lesson: readString(lesson?.lesson) ?? '',
    };
    const done = isConfirmed(payload, 'LESSON', input.talker);
    actions = [
      {
        id: 'continue',
        type: 'CONTINUE',
        label: 'Dalej',
        voteValue: null,
        disabled: done,
      },
    ];
  } else if (screen === 'DATE') {
    const date = asRecord(payload.date);
    const scenario = Array.isArray(date?.scenario)
      ? date!.scenario.filter((s): s is string => typeof s === 'string')
      : [];
    content = {
      dateIdea: readString(date?.dateIdea) ?? '',
      scenario,
    };
    const done = isConfirmed(payload, 'DATE', input.talker);
    actions = [
      {
        id: 'finish',
        type: 'FINISH',
        label: 'Zakończ',
        voteValue: null,
        disabled: done,
      },
    ];
  } else if (screen === 'END') {
    const agreement = readPublicEndAgreement(payload);
    if (!agreement) {
      throw new AppError(
        'UNSUPPORTED_SESSION_STATE',
        422,
        'end_agreement_missing'
      );
    }
    content = {
      closingMessage: 'Dziękujemy — możecie wrócić do aplikacji.',
      agreement,
    };
    actions = [
      {
        id: 'close',
        type: 'CLOSE',
        label: 'Wróć',
        voteValue: null,
      },
    ];
  }

  return {
    ok: true,
    sessionId: input.session.session_id,
    screen,
    title: TITLES[screen],
    subtitle: SUBTITLES[screen],
    content,
    actions,
    progress: progressForScreen(screen, input.session.progress_total),
    generationStatus: input.session.generation_status,
    sessionVersion: input.session.session_version,
    correlationId: input.correlationId,
    ...(input.replayed ? { replayed: true } : {}),
    ...(input.processing
      ? { processing: true, message: input.message ?? 'PROCESSING' }
      : {}),
    ...(!input.processing && input.message ? { message: input.message } : {}),
  };
}

export function isPublicEnvelope(
  value: unknown
): value is MediationTurnV2Envelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    row.ok === true &&
    typeof row.sessionId === 'string' &&
    typeof row.screen === 'string' &&
    typeof row.sessionVersion === 'number' &&
    typeof row.correlationId === 'string'
  );
}

export function processingEnvelope(input: {
  session: MediationSessionRow;
  correlationId: string;
}): MediationTurnV2Envelope {
  return buildEnvelope({
    session: input.session,
    talker: 'HOST',
    correlationId: input.correlationId,
    processing: true,
    message: 'PROCESSING',
  });
}
