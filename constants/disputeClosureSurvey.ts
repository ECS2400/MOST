import type { Language } from '@/constants/i18n';
import {
  formatClosureSurveyContext,
  getClosureBundle,
  type ClosureSurveyQuestion,
} from '@/constants/i18n/closure';

export type ClosureSurveyAnswers = Record<string, string>;
export type { ClosureSurveyQuestion };

/** @deprecated Use getClosureBundle(lang).survey */
export const CLOSURE_SURVEY_QUESTIONS: ClosureSurveyQuestion[] = getClosureBundle('pl').survey;

export function formatSurveyForContext(
  answers: ClosureSurveyAnswers,
  lang: Language = 'pl'
): string {
  return formatClosureSurveyContext(lang, answers);
}
