const STOP_WORDS = new Set([
  'i', 'a', 'o', 'w', 'z', 'na', 'do', 'ze', 'to', 'ty', 'ja', 'nie', 'się', 'sie', 'że', 'ze',
  'the', 'a', 'an', 'and', 'or', 'but', 'you', 'your', 'is', 'are', 'was', 'to', 'of', 'in', 'on',
  'co', 'jak', 'czy', 'że', 'to', 'ten', 'ta', 'ci', 'go', 'jej', 'jego', 'żeby', 'zeby', 'moze',
  'może', 'bardzo', 'tez', 'też', 'już', 'juz', 'gdy', 'kiedy', 'tam', 'tu', 'tu', 'tam', 'po',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function extractQuestion(text: string): string {
  const parts = text.split('?');
  if (parts.length < 2) return '';
  return normalizeText(parts[parts.length - 2] ?? '');
}

function extractAddressee(text: string, knownNames: string[]): string | null {
  const normalized = normalizeText(text);
  for (const name of knownNames) {
    const normalizedName = normalizeText(name);
    if (normalizedName.length > 1 && normalized.includes(normalizedName)) {
      return normalizedName;
    }
  }
  return null;
}

function sharedTokenRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter((token) => setB.has(token)).length;
  return shared / Math.min(a.length, b.length);
}

export interface RepetitionAnalysisInput {
  draftText: string;
  recentMediatorMessages: string[];
  interventionType?: string;
  knownNames?: string[];
}

export interface RepetitionAnalysisResult {
  repeated: boolean;
  reasons: string[];
}

export type RepetitionMatchType =
  | 'semantic_overlap'
  | 'repeated_phrase'
  | 'question_overlap'
  | 'addressee_overlap';

export interface RepeatedInterventionMatchDetail {
  priorIndex: number;
  priorText: string;
  matchedPhrase: string | null;
  matchTypes: RepetitionMatchType[];
  tokenOverlap: number;
  tokenOverlapThreshold: number;
  phraseHitCount: number;
  phraseLength: number;
  phraseThreshold: number;
  questionOverlap: number | null;
  questionOverlapThreshold: number | null;
  matchedReasons: string[];
}

export interface RepetitionAnalysisDetailedResult extends RepetitionAnalysisResult {
  matches: RepeatedInterventionMatchDetail[];
  bestMatch: RepeatedInterventionMatchDetail | null;
}

const TOKEN_OVERLAP_THRESHOLD = 0.45;
const PHRASE_LENGTH = 3;
/** Standalone phrase hits must reach 2, or 1 with moderate token overlap. */
const PHRASE_HIT_STANDALONE_THRESHOLD = 2;
const PHRASE_HIT_COMPOUND_TOKEN_THRESHOLD = 0.3;
const QUESTION_OVERLAP_THRESHOLD = 0.5;
const ADDRESSEE_OVERLAP_THRESHOLD = 0.3;
const RECENT_MESSAGE_LIMIT = 3;

function phraseBlocksRepetition(phraseHitCount: number, tokenOverlap: number): boolean {
  return (
    phraseHitCount >= PHRASE_HIT_STANDALONE_THRESHOLD ||
    (phraseHitCount >= 1 && tokenOverlap >= PHRASE_HIT_COMPOUND_TOKEN_THRESHOLD)
  );
}

function findSharedPhrases(a: string, b: string, phraseLen = PHRASE_LENGTH): string[] {
  const wordsA = normalizeText(a).split(' ').filter(Boolean);
  const wordsB = normalizeText(b).split(' ').filter(Boolean);
  if (wordsA.length < phraseLen || wordsB.length < phraseLen) return [];

  const phrasesB = new Set<string>();
  for (let i = 0; i <= wordsB.length - phraseLen; i += 1) {
    phrasesB.add(wordsB.slice(i, i + phraseLen).join(' '));
  }

  const hits: string[] = [];
  for (let i = 0; i <= wordsA.length - phraseLen; i += 1) {
    const phrase = wordsA.slice(i, i + phraseLen).join(' ');
    if (phrasesB.has(phrase)) hits.push(phrase);
  }
  return [...new Set(hits)];
}

function analyzeAgainstPrior(
  draft: string,
  prior: string,
  priorIndex: number,
  knownNames: string[]
): RepeatedInterventionMatchDetail {
  const draftTokens = tokenize(draft);
  const priorTokens = tokenize(prior);
  const tokenOverlap = sharedTokenRatio(draftTokens, priorTokens);
  const sharedPhrases = findSharedPhrases(draft, prior, PHRASE_LENGTH);
  const phraseHitCount = sharedPhrases.length;

  const draftQuestion = extractQuestion(draft);
  const priorQuestion = extractQuestion(prior);
  const questionOverlap =
    draftQuestion.length > 8 && priorQuestion.length > 8
      ? sharedTokenRatio(tokenize(draftQuestion), tokenize(priorQuestion))
      : null;

  const draftAddressee = extractAddressee(draft, knownNames);
  const priorAddressee = extractAddressee(prior, knownNames);

  const matchedReasons: string[] = [];
  const matchTypes: RepetitionMatchType[] = [];

  if (tokenOverlap >= TOKEN_OVERLAP_THRESHOLD) {
    matchedReasons.push('semantic overlap with prior mediator message');
    matchTypes.push('semantic_overlap');
  }
  if (phraseBlocksRepetition(phraseHitCount, tokenOverlap)) {
    matchedReasons.push('repeated phrase from prior mediator message');
    matchTypes.push('repeated_phrase');
  }
  if (questionOverlap != null && questionOverlap >= QUESTION_OVERLAP_THRESHOLD) {
    matchedReasons.push('same question target as prior mediator message');
    matchTypes.push('question_overlap');
  }
  if (
    draftAddressee &&
    priorAddressee &&
    draftAddressee === priorAddressee &&
    tokenOverlap >= ADDRESSEE_OVERLAP_THRESHOLD
  ) {
    matchedReasons.push('same addressee with similar intervention');
    matchTypes.push('addressee_overlap');
  }

  return {
    priorIndex,
    priorText: prior,
    matchedPhrase: sharedPhrases[0] ?? null,
    matchTypes,
    tokenOverlap,
    tokenOverlapThreshold: TOKEN_OVERLAP_THRESHOLD,
    phraseHitCount,
    phraseLength: PHRASE_LENGTH,
    phraseThreshold: PHRASE_HIT_STANDALONE_THRESHOLD,
    questionOverlap,
    questionOverlapThreshold: QUESTION_OVERLAP_THRESHOLD,
    matchedReasons,
  };
}

/** Detailed repetition analysis with per-prior match metadata for diagnostics. */
export function analyzeRepeatedInterventionDetailed(
  input: RepetitionAnalysisInput
): RepetitionAnalysisDetailedResult {
  const recent = input.recentMediatorMessages
    .map((text) => (typeof text === 'string' ? text.trim() : ''))
    .filter((text) => text.length > 0)
    .slice(-RECENT_MESSAGE_LIMIT);

  const draft = input.draftText.trim();
  if (recent.length === 0 || draft.length === 0) {
    return { repeated: false, reasons: [], matches: [], bestMatch: null };
  }

  const knownNames = (input.knownNames ?? []).filter(Boolean);
  const matches = recent.map((prior, index) =>
    analyzeAgainstPrior(draft, prior, index, knownNames)
  );

  const reasons = [...new Set(matches.flatMap((match) => match.matchedReasons))];
  const bestMatch =
    matches
      .filter((match) => match.matchedReasons.length > 0)
      .sort((a, b) => b.matchedReasons.length - a.matchedReasons.length)[0] ?? null;

  return {
    repeated: reasons.length > 0,
    reasons,
    matches,
    bestMatch,
  };
}

/** Compares a draft reply against recent mediator messages for cross-turn repetition. */
export function analyzeRepeatedIntervention(
  input: RepetitionAnalysisInput
): RepetitionAnalysisResult {
  const detailed = analyzeRepeatedInterventionDetailed(input);
  return {
    repeated: detailed.repeated,
    reasons: detailed.reasons,
  };
}
