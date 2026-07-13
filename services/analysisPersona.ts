import type { MediationAnalysis } from '@/services/mediationAnalysisInterpret';

/** Forbidden third-person labels in analysis copy shown to the app user. */
export const PERSONA_FORBIDDEN_RE =
  /\b(użytkownik|użytkownika|użytkownikowi|użytkownikiem|użytkownicy|user|users)\b/gi;

const PERSONA_REPLACEMENTS: [RegExp, string][] = [
  [/\bużytkownikiem\b/gi, 'Tobą'],
  [/\bużytkownikowi\b/gi, 'Tobie'],
  [/\bużytkownika\b/gi, 'Ciebie'],
  [/\bużytkownicy\b/gi, 'Wy'],
  [/\bużytkownik\b/gi, 'Ty'],
  [/\busers\b/gi, 'you'],
  [/\buser\b/gi, 'you'],
];

export function containsForbiddenPersonaWord(text: string): boolean {
  PERSONA_FORBIDDEN_RE.lastIndex = 0;
  return PERSONA_FORBIDDEN_RE.test(text);
}

export function sanitizePersonaText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PERSONA_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function sanitizeStringArray(values: string[] | string | undefined): string[] | string | undefined {
  if (!values) return values;
  if (Array.isArray(values)) {
    return values.map((value) => sanitizePersonaText(value));
  }
  return sanitizePersonaText(values);
}

/** Removes third-person "użytkownik/user" phrasing from all analysis text fields. */
export function sanitizeAnalysisPersona<T extends MediationAnalysis>(analysis: T): T {
  return {
    ...analysis,
    situation_summary: analysis.situation_summary
      ? sanitizePersonaText(analysis.situation_summary)
      : analysis.situation_summary,
    emotions_explanation: analysis.emotions_explanation
      ? sanitizePersonaText(analysis.emotions_explanation)
      : analysis.emotions_explanation,
    needs_explanation: analysis.needs_explanation
      ? sanitizePersonaText(analysis.needs_explanation)
      : analysis.needs_explanation,
    key_trigger: analysis.key_trigger
      ? sanitizePersonaText(analysis.key_trigger)
      : analysis.key_trigger,
    what_could_improve: analysis.what_could_improve
      ? sanitizePersonaText(analysis.what_could_improve)
      : analysis.what_could_improve,
    doing_well: analysis.doing_well
      ? sanitizePersonaText(analysis.doing_well)
      : analysis.doing_well,
    doing_well_detail: analysis.doing_well_detail
      ? sanitizePersonaText(analysis.doing_well_detail)
      : analysis.doing_well_detail,
    perspective_gap_title: analysis.perspective_gap_title
      ? sanitizePersonaText(analysis.perspective_gap_title)
      : analysis.perspective_gap_title,
    perspective_gap_detail: analysis.perspective_gap_detail
      ? sanitizePersonaText(analysis.perspective_gap_detail)
      : analysis.perspective_gap_detail,
    suggestion_quote: analysis.suggestion_quote
      ? sanitizePersonaText(analysis.suggestion_quote)
      : analysis.suggestion_quote,
    suggestion_tip: analysis.suggestion_tip
      ? sanitizePersonaText(analysis.suggestion_tip)
      : analysis.suggestion_tip,
    user_emotions: sanitizeStringArray(analysis.user_emotions) as string[] | string | undefined,
    user_needs: sanitizeStringArray(analysis.user_needs) as string[] | string | undefined,
    partner_emotions: sanitizeStringArray(analysis.partner_emotions) as
      | string[]
      | string
      | undefined,
    partner_needs: sanitizeStringArray(analysis.partner_needs) as string[] | string | undefined,
    emotionsSummary: analysis.emotionsSummary
      ? sanitizePersonaText(analysis.emotionsSummary)
      : analysis.emotionsSummary,
    needsSummary: analysis.needsSummary
      ? sanitizePersonaText(analysis.needsSummary)
      : analysis.needsSummary,
    bridgeStatement: analysis.bridgeStatement
      ? sanitizePersonaText(analysis.bridgeStatement)
      : analysis.bridgeStatement,
    celebration: analysis.celebration
      ? sanitizePersonaText(analysis.celebration)
      : analysis.celebration,
    misunderstanding: analysis.misunderstanding
      ? sanitizePersonaText(analysis.misunderstanding)
      : analysis.misunderstanding,
    what_went_wrong: analysis.what_went_wrong
      ? sanitizePersonaText(analysis.what_went_wrong)
      : analysis.what_went_wrong,
    situation_facts: analysis.situation_facts
      ? sanitizePersonaText(analysis.situation_facts)
      : analysis.situation_facts,
    perspective_gap: analysis.perspective_gap
      ? sanitizePersonaText(analysis.perspective_gap)
      : analysis.perspective_gap,
    suggestions: analysis.suggestions?.map((item) => sanitizePersonaText(item)),
  };
}

const ANALYSIS_TEXT_FIELDS: (keyof MediationAnalysis)[] = [
  'situation_summary',
  'emotions_explanation',
  'needs_explanation',
  'key_trigger',
  'what_could_improve',
  'doing_well',
  'doing_well_detail',
  'perspective_gap_title',
  'perspective_gap_detail',
  'suggestion_quote',
  'suggestion_tip',
  'emotionsSummary',
  'needsSummary',
  'bridgeStatement',
  'celebration',
  'misunderstanding',
  'what_went_wrong',
  'situation_facts',
  'perspective_gap',
];

const ANALYSIS_TAG_FIELDS: (keyof MediationAnalysis)[] = [
  'user_emotions',
  'user_needs',
  'partner_emotions',
  'partner_needs',
  'suggestions',
];

/** Collects user-visible analysis strings for snapshot / regression tests. */
export function collectAnalysisDisplayText(analysis: MediationAnalysis): string[] {
  const values: string[] = [];

  for (const field of ANALYSIS_TEXT_FIELDS) {
    const value = analysis[field];
    if (typeof value === 'string' && value.trim()) {
      values.push(value.trim());
    }
  }

  for (const field of ANALYSIS_TAG_FIELDS) {
    const value = analysis[field];
    if (Array.isArray(value)) {
      values.push(...value.filter((item) => typeof item === 'string' && item.trim()));
    } else if (typeof value === 'string' && value.trim()) {
      values.push(value.trim());
    }
  }

  return values;
}

export function formatAnalysisDisplaySnapshot(analysis: MediationAnalysis): string {
  return collectAnalysisDisplayText(analysis).join('\n---\n');
}

export function firstNameFromParticipantName(name?: string): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/)[0];
}

/** Optional first-name prefix for direct-address fallback copy. */
export function withDirectAddress(name: string | undefined, sentence: string): string {
  const firstName = firstNameFromParticipantName(name);
  if (!firstName) return sentence;
  const lead = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  return `${firstName}, ${lead}`;
}

export const ANALYSIS_PERSONA_PROMPT_PL = `PERSONA (krytyczne dla polskiego):
- Pisz BEZPOŚREDNIO do osoby korzystającej z aplikacji (Ty, Tobie, Twoje, czujesz, potrzebujesz).
- Jeśli podano participant_name, możesz naturalnie użyć imienia (np. „Daniel, wygląda na to, że…”).
- NIGDY nie używaj: użytkownik, user, osoba korzystająca z aplikacji.
- Pisz jak mediator w sesji — do rozmówcy, nie o rozmówcy w raporcie.`;

export const ANALYSIS_PERSONA_PROMPT_EN = `PERSONA (critical):
- Address the person directly (you, your, you feel, you need).
- If participant_name is provided, you may use their first name naturally.
- NEVER use: user, the user, app user.
- Write as a mediator speaking TO them, not ABOUT them.`;
