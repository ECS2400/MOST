import type { EasyChoiceRound, MediationRow } from './types.ts';
import { AppError } from './errors.ts';

/** Identifies this SUMMARY prompt revision (not user content). */
export const SUMMARY_PROMPT_VERSION = 'summary-v2-1';

/**
 * Anthropic model id — must match the `model` field sent to the API
 * and the value stored as mediation_sessions.model_version.
 */
export const SUMMARY_MODEL_VERSION = 'claude-sonnet-4-20250514';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const SUMMARY_MAX_TOKENS = 1024;
const EASY_CHOICES_MAX_TOKENS = 2048;
const SCREEN_MAX_TOKENS = 1024;
const TEMPERATURE = 0.3;
const ANALYSIS_EXCERPT_MAX = 400;

function trim(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function analysisExcerpt(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = '';
  if (typeof value === 'string') {
    text = value.trim();
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      return '';
    }
  }
  if (!text) return '';
  if (text.length <= ANALYSIS_EXCERPT_MAX) return text;
  return `${text.slice(0, ANALYSIS_EXCERPT_MAX)}…`;
}

function sideNarrative(
  label: string,
  fields: Array<[string, string | null | undefined]>,
  combined: string | null | undefined,
  analysis: unknown
): string {
  const lines: string[] = [];
  const hasDetail = fields.some(([, value]) => trim(value).length > 0);
  const combinedText = trim(combined);

  if (combinedText && !hasDetail) {
    lines.push(`Opis łączony:\n${combinedText}`);
  } else {
    for (const [name, value] of fields) {
      const text = trim(value);
      if (text) lines.push(`${name}:\n${text}`);
    }
    if (combinedText) {
      lines.push(`Opis łączony:\n${combinedText}`);
    }
  }

  const excerpt = analysisExcerpt(analysis);
  if (excerpt) lines.push(`Analiza (fragment):\n${excerpt}`);

  const body = lines.join('\n\n');
  return body ? `--- ${label} ---\n${body}` : '';
}

export function buildSummaryPrompt(input: {
  mediation: MediationRow;
  language: string;
}): { system: string; user: string } {
  const m = input.mediation;
  const language = input.language.trim() || 'pl';

  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu SUMMARY.',
    'Nie sterujesz flow.',
    'Nie wybierasz następnego ekranu.',
    'Nie generujesz pytań, deali, lekcji ani randki.',
    'Nie dodajesz metadanych, statusów ani nextScreen.',
    'Zwróć dokładnie jeden obiekt JSON z jednym polem "text" (string).',
    'Bez markdown, bez code fence, bez dodatkowych kluczy.',
    `Napisz treść pola "text" w języku: ${language}.`,
  ].join('\n');

  const host = sideNarrative(
    'HOST',
    [
      ['Co się wydarzyło', m.what_happened],
      ['Co zdenerwowało', m.what_angered],
      ['Jak się czuł/a', m.how_felt],
      ['Czego potrzebował/a', m.what_needed],
      ['Co chciał/a powiedzieć', m.what_to_say],
    ],
    m.combined_description,
    m.analysis
  );

  const partner = sideNarrative(
    'PARTNER',
    [
      ['Co się wydarzyło', m.partner_what_happened],
      ['Co zdenerwowało', m.partner_what_angered],
      ['Jak się czuł/a', m.partner_how_felt],
      ['Czego potrzebował/a', m.partner_what_needed],
      ['Co chciał/a powiedzieć', m.partner_what_to_say],
    ],
    m.partner_combined_description,
    m.partner_analysis
  );

  const category = trim(m.conflict_category);
  const user = [
    'DANE WEJŚCIOWE (autoritative, do wykorzystania w SUMMARY):',
    category ? `Kategoria konfliktu: ${category}` : '',
    '',
    host || '--- HOST ---\n(brak danych hosta)',
    '',
    partner || '--- PARTNER ---\n(brak danych partnera)',
    '',
    'Wygeneruj JSON: {"text":"..."}',
  ]
    .filter((line, index, all) => line !== '' || all[index - 1] !== '')
    .join('\n');

  return { system, user };
}

export function buildEasyChoicesPrompt(input: {
  summaryText: string;
  conflictCategory: string;
  language: string;
}): { system: string; user: string } {
  const language = input.language.trim() || 'pl';
  const summary = input.summaryText.trim();
  const category = input.conflictCategory.trim();

  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu EASY_CHOICES.',
    'Nie sterujesz flow.',
    'Nie wybierasz następnego ekranu.',
    'Nie generujesz summary, deali, lekcji ani randki.',
    'Nie dodajesz metadanych, statusów ani nextScreen.',
    'Sam tworzysz pytania (title) i odpowiedzi (choices).',
    'Zwróć dokładnie jeden obiekt JSON z polem "rounds" (array).',
    'Każdy element rounds: { "title": string, "choices": string[] }.',
    'Bez markdown, bez code fence, bez dodatkowych kluczy na root.',
    `Napisz title i choices w języku: ${language}.`,
  ].join('\n');

  const user = [
    'DANE WEJŚCIOWE (autoritative, do wykorzystania w EASY_CHOICES):',
    '',
    `Kategoria konfliktu: ${category || '(brak)'}`,
    '',
    '--- SUMMARY (już wygenerowane) ---',
    summary || '(brak summary)',
    '',
    'Wygeneruj JSON: {"rounds":[{"title":"...","choices":["...","...","...","..."]}]}',
  ].join('\n');

  return { system, user };
}

function stripOuterFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) {
    return fenced[1].trim();
  }
  return trimmed;
}

/**
 * Exactly one JSON.parse; one optional outer fence strip; no repairs.
 */
export function parseLlmJsonObject(raw: string): Record<string, unknown> {
  const stripped = stripOuterFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_llm_json');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_llm_shape');
  }

  return parsed as Record<string, unknown>;
}

export function parseSummaryLlmText(raw: string): string {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== 'text') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_summary_keys');
  }

  const text = parsed.text;
  if (typeof text !== 'string' || text.trim().length < 1) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_summary_text');
  }

  return text.trim();
}

export function parseEasyChoicesLlmRounds(raw: string): EasyChoiceRound[] {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== 'rounds') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_easy_choices_keys');
  }

  const rounds = parsed.rounds;
  if (!Array.isArray(rounds) || rounds.length < 1) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_easy_choices_rounds');
  }

  const validated: EasyChoiceRound[] = [];
  for (const item of rounds) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_easy_choices_round');
    }
    const row = item as Record<string, unknown>;
    const rowKeys = Object.keys(row);
    if (
      rowKeys.length !== 2 ||
      !rowKeys.includes('title') ||
      !rowKeys.includes('choices')
    ) {
      throw new AppError(
        'LLM_INVALID_RESPONSE',
        422,
        'parse_easy_choices_round_keys'
      );
    }
    if (typeof row.title !== 'string' || row.title.trim().length < 1) {
      throw new AppError(
        'LLM_INVALID_RESPONSE',
        422,
        'parse_easy_choices_title'
      );
    }
    if (!Array.isArray(row.choices) || row.choices.length < 1) {
      throw new AppError(
        'LLM_INVALID_RESPONSE',
        422,
        'parse_easy_choices_choices'
      );
    }
    const choices: string[] = [];
    for (const choice of row.choices) {
      if (typeof choice !== 'string' || choice.trim().length < 1) {
        throw new AppError(
          'LLM_INVALID_RESPONSE',
          422,
          'parse_easy_choices_choice'
        );
      }
      choices.push(choice.trim());
    }
    validated.push({ title: row.title.trim(), choices });
  }

  return validated;
}

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'anthropic_shape');
  }
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'anthropic_content');
  }

  const textBlocks = content.filter(
    (block): block is { type: string; text: string } =>
      !!block &&
      typeof block === 'object' &&
      (block as { type?: unknown }).type === 'text' &&
      typeof (block as { text?: unknown }).text === 'string'
  );

  if (textBlocks.length !== 1) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'anthropic_text_blocks');
  }

  const text = textBlocks[0].text.trim();
  if (!text) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'anthropic_empty_text');
  }
  return text;
}

async function callAnthropic(input: {
  system: string;
  user: string;
  apiKey: string;
  maxTokens: number;
}): Promise<string> {
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL_VERSION,
        max_tokens: input.maxTokens,
        temperature: TEMPERATURE,
        system: input.system,
        messages: [{ role: 'user', content: input.user }],
      }),
    });
  } catch {
    throw new AppError('INTERNAL_ERROR', 500, 'anthropic_fetch');
  }

  if (!response.ok) {
    throw new AppError('INTERNAL_ERROR', 500, 'anthropic_http');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'anthropic_json');
  }

  return extractAnthropicText(body);
}

export async function generateSummaryText(input: {
  mediation: MediationRow;
  language: string;
  apiKey: string;
}): Promise<string> {
  const { system, user } = buildSummaryPrompt({
    mediation: input.mediation,
    language: input.language,
  });
  const rawText = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: SUMMARY_MAX_TOKENS,
  });
  return parseSummaryLlmText(rawText);
}

export async function generateEasyChoicesRounds(input: {
  summaryText: string;
  conflictCategory: string;
  language: string;
  apiKey: string;
}): Promise<EasyChoiceRound[]> {
  const { system, user } = buildEasyChoicesPrompt({
    summaryText: input.summaryText,
    conflictCategory: input.conflictCategory,
    language: input.language,
  });
  const rawText = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: EASY_CHOICES_MAX_TOKENS,
  });
  return parseEasyChoicesLlmRounds(rawText);
}

function requireStringField(
  parsed: Record<string, unknown>,
  key: string,
  stage: string
): string {
  const value = parsed[key];
  if (typeof value !== 'string' || value.trim().length < 1) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, stage);
  }
  return value.trim();
}

export function parseFirstDealLlm(raw: string): { dealText: string } {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== 'dealText') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_first_deal_keys');
  }
  return { dealText: requireStringField(parsed, 'dealText', 'parse_first_deal') };
}

export function parseCompromiseLlm(raw: string): {
  dealText: string;
  whyItFitsBoth: string;
} {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed).sort();
  if (keys.join(',') !== 'dealText,whyItFitsBoth') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_compromise_keys');
  }
  return {
    dealText: requireStringField(parsed, 'dealText', 'parse_compromise_deal'),
    whyItFitsBoth: requireStringField(
      parsed,
      'whyItFitsBoth',
      'parse_compromise_why'
    ),
  };
}

export function parseLessonLlm(raw: string): {
  observation: string;
  lesson: string;
} {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed).sort();
  if (keys.join(',') !== 'lesson,observation') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_lesson_keys');
  }
  return {
    observation: requireStringField(
      parsed,
      'observation',
      'parse_lesson_observation'
    ),
    lesson: requireStringField(parsed, 'lesson', 'parse_lesson_text'),
  };
}

export function parseDateLlm(raw: string): {
  dateIdea: string;
  scenario: string[];
} {
  const parsed = parseLlmJsonObject(raw);
  const keys = Object.keys(parsed).sort();
  if (keys.join(',') !== 'dateIdea,scenario') {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_date_keys');
  }
  const dateIdea = requireStringField(parsed, 'dateIdea', 'parse_date_idea');
  if (!Array.isArray(parsed.scenario) || parsed.scenario.length < 1) {
    throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_date_scenario');
  }
  const scenario: string[] = [];
  for (const step of parsed.scenario) {
    if (typeof step !== 'string' || step.trim().length < 1) {
      throw new AppError('LLM_INVALID_RESPONSE', 422, 'parse_date_step');
    }
    scenario.push(step.trim());
  }
  return { dateIdea, scenario };
}

export function buildFirstDealPrompt(input: {
  summaryText: string;
  conflictCategory: string;
  language: string;
}): { system: string; user: string } {
  const language = input.language.trim() || 'pl';
  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu FIRST_DEAL.',
    'Nie sterujesz flow. Nie generujesz innych ekranów.',
    'Zwróć dokładnie jeden obiekt JSON: {"dealText":"..."}.',
    'Bez markdown, bez code fence, bez dodatkowych kluczy.',
    `Napisz dealText w języku: ${language}.`,
  ].join('\n');
  const user = [
    'DANE WEJŚCIOWE:',
    `Kategoria konfliktu: ${input.conflictCategory.trim() || '(brak)'}`,
    '',
    '--- SUMMARY ---',
    input.summaryText.trim() || '(brak)',
    '',
    'Wygeneruj jedną konkretną, wykonalną propozycję rozwiązania.',
    'JSON: {"dealText":"..."}',
  ].join('\n');
  return { system, user };
}

export function buildCompromisePrompt(input: {
  summaryText: string;
  firstDealText: string;
  hostVote: string;
  partnerVote: string;
  conflictCategory: string;
  language: string;
}): { system: string; user: string } {
  const language = input.language.trim() || 'pl';
  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu COMPROMISE.',
    'Nie sterujesz flow. Nie generujesz innych ekranów.',
    'Zwróć JSON: {"dealText":"...","whyItFitsBoth":"..."}.',
    'Bez markdown, bez code fence, bez dodatkowych kluczy.',
    `Napisz treść w języku: ${language}.`,
  ].join('\n');
  const user = [
    'DANE WEJŚCIOWE:',
    `Kategoria: ${input.conflictCategory.trim() || '(brak)'}`,
    `Głos HOST: ${input.hostVote}`,
    `Głos PARTNER: ${input.partnerVote}`,
    '',
    '--- SUMMARY ---',
    input.summaryText.trim() || '(brak)',
    '',
    '--- FIRST_DEAL (odrzucony / niepełna zgoda) ---',
    input.firstDealText.trim() || '(brak)',
    '',
    'JSON: {"dealText":"...","whyItFitsBoth":"..."}',
  ].join('\n');
  return { system, user };
}

export function buildLessonPrompt(input: {
  summaryText: string;
  agreementText: string;
  language: string;
}): { system: string; user: string } {
  const language = input.language.trim() || 'pl';
  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu LESSON.',
    'Nie sterujesz flow. Nie generujesz DATE ani innych ekranów.',
    'Zwróć JSON: {"observation":"...","lesson":"..."}.',
    'Bez markdown, bez code fence, bez dodatkowych kluczy.',
    `Napisz treść w języku: ${language}.`,
  ].join('\n');
  const user = [
    'DANE WEJŚCIOWE:',
    '',
    '--- SUMMARY ---',
    input.summaryText.trim() || '(brak)',
    '',
    '--- AGREEMENT ---',
    input.agreementText.trim() || '(brak)',
    '',
    'JSON: {"observation":"...","lesson":"..."}',
  ].join('\n');
  return { system, user };
}

export function buildDatePrompt(input: {
  summaryText: string;
  lessonText: string;
  language: string;
}): { system: string; user: string } {
  const language = input.language.trim() || 'pl';
  const system = [
    'Jesteś Mościkiem, AI mediatorem dla par.',
    'Generujesz wyłącznie treść ekranu DATE.',
    'Nie sterujesz flow. Nie generujesz LESSON ani innych ekranów.',
    'Zwróć JSON: {"dateIdea":"...","scenario":["...","...","..."]}.',
    'scenario: 3–5 krótkich kroków.',
    'Bez markdown, bez code fence, bez dodatkowych kluczy.',
    `Napisz treść w języku: ${language}.`,
  ].join('\n');
  const user = [
    'DANE WEJŚCIOWE:',
    '',
    '--- SUMMARY ---',
    input.summaryText.trim() || '(brak)',
    '',
    '--- LESSON ---',
    input.lessonText.trim() || '(brak)',
    '',
    'JSON: {"dateIdea":"...","scenario":["..."]}',
  ].join('\n');
  return { system, user };
}

export async function generateFirstDeal(input: {
  summaryText: string;
  conflictCategory: string;
  language: string;
  apiKey: string;
}): Promise<{ dealText: string }> {
  const { system, user } = buildFirstDealPrompt(input);
  const raw = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: SCREEN_MAX_TOKENS,
  });
  return parseFirstDealLlm(raw);
}

export async function generateCompromise(input: {
  summaryText: string;
  firstDealText: string;
  hostVote: string;
  partnerVote: string;
  conflictCategory: string;
  language: string;
  apiKey: string;
}): Promise<{ dealText: string; whyItFitsBoth: string }> {
  const { system, user } = buildCompromisePrompt(input);
  const raw = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: SCREEN_MAX_TOKENS,
  });
  return parseCompromiseLlm(raw);
}

export async function generateLesson(input: {
  summaryText: string;
  agreementText: string;
  language: string;
  apiKey: string;
}): Promise<{ observation: string; lesson: string }> {
  const { system, user } = buildLessonPrompt(input);
  const raw = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: SCREEN_MAX_TOKENS,
  });
  return parseLessonLlm(raw);
}

export async function generateDate(input: {
  summaryText: string;
  lessonText: string;
  language: string;
  apiKey: string;
}): Promise<{ dateIdea: string; scenario: string[] }> {
  const { system, user } = buildDatePrompt(input);
  const raw = await callAnthropic({
    system,
    user,
    apiKey: input.apiKey,
    maxTokens: SCREEN_MAX_TOKENS,
  });
  return parseDateLlm(raw);
}
