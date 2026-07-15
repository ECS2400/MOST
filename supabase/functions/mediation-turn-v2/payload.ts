import type { EasyChoiceRound, Talker, VoteValue } from './types.ts';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clonePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return structuredClone(payload);
}

function optionIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(97 + i));
}

/** Persist SUMMARY as plain string (DB contract §3.2). */
export function withSummaryOnPayload(
  payload: Record<string, unknown>,
  text: string
): Record<string, unknown> {
  const next = clonePayload(payload);
  next.summary = text;
  return next;
}

export function readSummaryText(
  payload: Record<string, unknown>
): string | null {
  if (typeof payload.summary === 'string' && payload.summary.trim().length > 0) {
    return payload.summary.trim();
  }
  const nested = asRecord(payload.summary);
  if (nested && typeof nested.text === 'string' && nested.text.trim()) {
    return nested.text.trim();
  }
  return null;
}

/**
 * Store rounds in contract-ish shape; accept LLM title/choices input.
 * Each round: { roundIndex, question, options[{id,label}] }
 */
export function withEasyChoicesRoundsOnPayload(
  payload: Record<string, unknown>,
  rounds: EasyChoiceRound[]
): Record<string, unknown> {
  const next = clonePayload(payload);
  const existing = asRecord(next.easyChoices) ?? {};
  const mapped = rounds.slice(0, 5).map((round, i) => {
    const ids = optionIds(round.choices.length);
    return {
      roundIndex: i + 1,
      question: round.title,
      options: round.choices.map((label, j) => ({
        id: ids[j],
        label,
      })),
    };
  });
  next.easyChoices = {
    ...existing,
    rounds: mapped,
    answers: asRecord(existing.answers) ?? { HOST: {}, PARTNER: {} },
    currentRound:
      typeof existing.currentRound === 'number' && existing.currentRound >= 1
        ? existing.currentRound
        : 1,
  };
  return next;
}

export type StoredRound = {
  roundIndex: number;
  question: string;
  options: Array<{ id: string; label: string }>;
};

export function readEasyChoicesRounds(
  payload: Record<string, unknown>
): StoredRound[] | null {
  const easy = asRecord(payload.easyChoices);
  if (!easy || !Array.isArray(easy.rounds) || easy.rounds.length < 1) {
    return null;
  }
  const out: StoredRound[] = [];
  for (let i = 0; i < easy.rounds.length; i++) {
    const row = asRecord(easy.rounds[i]);
    if (!row) return null;

    // Contract shape
    if (typeof row.question === 'string' && Array.isArray(row.options)) {
      const options: Array<{ id: string; label: string }> = [];
      for (const opt of row.options) {
        const o = asRecord(opt);
        if (!o || typeof o.id !== 'string' || typeof o.label !== 'string') {
          return null;
        }
        options.push({ id: o.id, label: o.label.trim() });
      }
      if (options.length < 3) return null;
      out.push({
        roundIndex:
          typeof row.roundIndex === 'number' ? row.roundIndex : i + 1,
        question: row.question.trim(),
        options,
      });
      continue;
    }

    // Legacy LLM title/choices
    if (typeof row.title === 'string' && Array.isArray(row.choices)) {
      const labels = row.choices.filter(
        (c): c is string => typeof c === 'string' && c.trim().length > 0
      );
      if (labels.length < 3) return null;
      const ids = optionIds(labels.length);
      out.push({
        roundIndex: i + 1,
        question: row.title.trim(),
        options: labels.map((label, j) => ({ id: ids[j], label: label.trim() })),
      });
      continue;
    }
    return null;
  }
  return out.length >= 5 ? out.slice(0, 5) : out.length > 0 ? out : null;
}

export function readCurrentRound(payload: Record<string, unknown>): number {
  const easy = asRecord(payload.easyChoices);
  const n = easy && typeof easy.currentRound === 'number' ? easy.currentRound : 1;
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, 5);
}

export function setEasyChoicesCurrentRound(
  payload: Record<string, unknown>,
  round: number
): Record<string, unknown> {
  const next = clonePayload(payload);
  const easy = asRecord(next.easyChoices) ?? {};
  next.easyChoices = {
    ...easy,
    currentRound: Math.min(Math.max(round, 1), 5),
  };
  return next;
}

export function withFirstDealOnPayload(
  payload: Record<string, unknown>,
  dealText: string
): Record<string, unknown> {
  const next = clonePayload(payload);
  next.firstDeal = { dealText };
  return next;
}

export function withCompromiseOnPayload(
  payload: Record<string, unknown>,
  data: { dealText: string; whyItFitsBoth: string }
): Record<string, unknown> {
  const next = clonePayload(payload);
  next.compromise = {
    dealText: data.dealText,
    whyItFitsBoth: data.whyItFitsBoth,
  };
  next.agreement = {
    source: 'COMPROMISE',
    acceptance: 'GENERATED_FINAL',
    text: data.dealText,
    createdAt: new Date().toISOString(),
  };
  return next;
}

export function withLessonOnPayload(
  payload: Record<string, unknown>,
  data: { observation: string; lesson: string }
): Record<string, unknown> {
  const next = clonePayload(payload);
  next.lesson = {
    observation: data.observation,
    lesson: data.lesson,
  };
  return next;
}

export function withDateOnPayload(
  payload: Record<string, unknown>,
  data: { dateIdea: string; scenario: string[] }
): Record<string, unknown> {
  const next = clonePayload(payload);
  next.date = {
    dateIdea: data.dateIdea,
    scenario: data.scenario,
  };
  return next;
}

export function withAgreementFromFirstDeal(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = clonePayload(payload);
  const fd = asRecord(next.firstDeal);
  const text =
    typeof fd?.dealText === 'string'
      ? fd.dealText
      : typeof fd?.text === 'string'
        ? fd.text
        : '';
  next.agreement = {
    source: 'FIRST_DEAL',
    acceptance: 'ACCEPTED_BY_BOTH',
    text,
    createdAt: new Date().toISOString(),
  };
  return next;
}

export function setConfirmation(
  payload: Record<string, unknown>,
  screen: 'SUMMARY' | 'COMPROMISE' | 'LESSON' | 'DATE',
  talker: Talker
): Record<string, unknown> {
  const next = clonePayload(payload);
  const all = asRecord(next.confirmations) ?? {};
  const bucket = asRecord(all[screen]) ?? { HOST: false, PARTNER: false };
  bucket[talker] = true;
  all[screen] = bucket;
  next.confirmations = all;
  return next;
}

export function isConfirmed(
  payload: Record<string, unknown>,
  screen: 'SUMMARY' | 'COMPROMISE' | 'LESSON' | 'DATE',
  talker: Talker
): boolean {
  const all = asRecord(payload.confirmations) ?? {};
  const bucket = asRecord(all[screen]) ?? {};
  return bucket[talker] === true;
}

export function bothConfirmed(
  payload: Record<string, unknown>,
  screen: 'SUMMARY' | 'COMPROMISE' | 'LESSON' | 'DATE'
): boolean {
  return (
    isConfirmed(payload, screen, 'HOST') &&
    isConfirmed(payload, screen, 'PARTNER')
  );
}

export function partnerOf(talker: Talker): Talker {
  return talker === 'HOST' ? 'PARTNER' : 'HOST';
}

export function setEasyChoiceAnswer(
  payload: Record<string, unknown>,
  talker: Talker,
  round: number,
  optionId: string
): Record<string, unknown> {
  const next = clonePayload(payload);
  const easy = asRecord(next.easyChoices) ?? {};
  const answers = asRecord(easy.answers) ?? { HOST: {}, PARTNER: {} };
  const side = asRecord(answers[talker]) ?? {};
  side[String(round)] = optionId;
  answers[talker] = side;
  next.easyChoices = { ...easy, answers };
  return next;
}

export function getEasyChoiceAnswer(
  payload: Record<string, unknown>,
  talker: Talker,
  round: number
): string | null {
  const easy = asRecord(payload.easyChoices);
  const answers = easy ? asRecord(easy.answers) : null;
  const side = answers ? asRecord(answers[talker]) : null;
  const v = side?.[String(round)];
  return typeof v === 'string' ? v : null;
}

export function bothAnsweredRound(
  payload: Record<string, unknown>,
  round: number
): boolean {
  return (
    getEasyChoiceAnswer(payload, 'HOST', round) !== null &&
    getEasyChoiceAnswer(payload, 'PARTNER', round) !== null
  );
}

export function setFirstDealVote(
  payload: Record<string, unknown>,
  talker: Talker,
  vote: VoteValue
): Record<string, unknown> {
  const next = clonePayload(payload);
  const votes = asRecord(next.firstDealVotes) ?? {};
  votes[talker] = vote;
  next.firstDealVotes = votes;
  return next;
}

export function getFirstDealVote(
  payload: Record<string, unknown>,
  talker: Talker
): VoteValue | null {
  const votes = asRecord(payload.firstDealVotes) ?? {};
  const v = votes[talker];
  if (v === 'yes' || v === 'no' || v === 'stubborn') return v;
  return null;
}

export function bothFirstDealVoted(payload: Record<string, unknown>): boolean {
  return (
    getFirstDealVote(payload, 'HOST') !== null &&
    getFirstDealVote(payload, 'PARTNER') !== null
  );
}

export function resolveFirstDealOutcome(
  payload: Record<string, unknown>
): 'YES_YES' | 'NEED_COMPROMISE' {
  if (
    getFirstDealVote(payload, 'HOST') === 'yes' &&
    getFirstDealVote(payload, 'PARTNER') === 'yes'
  ) {
    return 'YES_YES';
  }
  return 'NEED_COMPROMISE';
}

export function hasScreenContent(
  payload: Record<string, unknown>,
  kind: string
): boolean {
  if (kind === 'SUMMARY') return readSummaryText(payload) !== null;
  if (kind === 'EASY_CHOICES') {
    const rounds = readEasyChoicesRounds(payload);
    return rounds !== null && rounds.length >= 5;
  }
  if (kind === 'FIRST_DEAL') {
    const f = asRecord(payload.firstDeal);
    return (
      (typeof f?.dealText === 'string' && f.dealText.trim().length > 0) ||
      (typeof f?.text === 'string' && f.text.trim().length > 0)
    );
  }
  if (kind === 'COMPROMISE') {
    const c = asRecord(payload.compromise);
    return typeof c?.dealText === 'string' && c.dealText.trim().length > 0;
  }
  if (kind === 'LESSON') {
    const l = asRecord(payload.lesson);
    return (
      typeof l?.observation === 'string' &&
      l.observation.trim().length > 0 &&
      typeof l?.lesson === 'string' &&
      l.lesson.trim().length > 0
    );
  }
  if (kind === 'DATE') {
    const d = asRecord(payload.date);
    return typeof d?.dateIdea === 'string' && d.dateIdea.trim().length > 0;
  }
  return false;
}

export function markFailedAt(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = clonePayload(payload);
  const meta = asRecord(next.metadata) ?? {};
  meta.lastFailedAt = new Date().toISOString();
  next.metadata = meta;
  return next;
}
