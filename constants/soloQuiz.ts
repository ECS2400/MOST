import type { Language } from '@/constants/i18n';
import { getSoloQuizBundle } from '@/constants/i18n/soloQuiz';
import type { SoloQuizQuestion } from '@/constants/i18n/soloQuiz';

export type { SoloQuizQuestion } from '@/constants/i18n/soloQuiz';

export type SoloQuizAnswers = Record<string, string | string[]>;

export function getSoloQuizQuestions(lang: Language): SoloQuizQuestion[] {
  return getSoloQuizBundle(lang).questions;
}

export function formatQuizContext(answers: SoloQuizAnswers, lang: Language = 'pl'): string {
  const bundle = getSoloQuizBundle(lang);
  const lines: string[] = [];

  for (const q of bundle.questions) {
    const value = answers[q.id];
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    const text = Array.isArray(value) ? value.join(', ') : value;
    lines.push(`${bundle.contextLabels[q.id] || q.id}: ${text}`);
  }

  return lines.length > 0 ? `${bundle.contextHeader}\n${lines.join('\n')}` : '';
}

/** @deprecated Use getSoloQuizQuestions(lang) */
export const SOLO_QUIZ_QUESTIONS = getSoloQuizQuestions('pl');
