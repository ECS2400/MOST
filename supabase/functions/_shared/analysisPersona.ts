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

export function sanitizePersonaText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PERSONA_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export interface AnalysisPersonaFields {
  situation_summary?: string;
  emotions_explanation?: string;
  needs_explanation?: string;
  key_trigger?: string;
  what_could_improve?: string;
  doing_well?: string;
  doing_well_detail?: string;
  perspective_gap_title?: string;
  perspective_gap_detail?: string;
  suggestion_quote?: string;
  suggestion_tip?: string;
  user_emotions?: string[];
  user_needs?: string[];
  partner_emotions?: string[];
  partner_needs?: string[];
}

export function sanitizeAnalysisPersona<T extends AnalysisPersonaFields>(analysis: T): T {
  const sanitizeArray = (values?: string[]) =>
    values?.map((value) => sanitizePersonaText(value));

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
    user_emotions: sanitizeArray(analysis.user_emotions),
    user_needs: sanitizeArray(analysis.user_needs),
    partner_emotions: sanitizeArray(analysis.partner_emotions),
    partner_needs: sanitizeArray(analysis.partner_needs),
  };
}

export function firstNameFromParticipantName(name?: string): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/)[0];
}

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
