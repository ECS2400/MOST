import type { Language } from '@/constants/i18n';
import { CLOSURE_DE } from './de';
import { CLOSURE_EN } from './en';
import { CLOSURE_ES } from './es';
import { CLOSURE_FR } from './fr';
import { CLOSURE_IT } from './it';
import { CLOSURE_PL } from './pl';
import type { ClosureBundle } from './types';

const BUNDLES: Record<Language, ClosureBundle> = {
  pl: CLOSURE_PL,
  en: CLOSURE_EN,
  de: CLOSURE_DE,
  fr: CLOSURE_FR,
  es: CLOSURE_ES,
  it: CLOSURE_IT,
};

export function getClosureBundle(lang: Language): ClosureBundle {
  return BUNDLES[lang] ?? CLOSURE_PL;
}

export function formatClosureSurveyContext(
  lang: Language,
  answers: Record<string, string>
): string {
  const survey = getClosureBundle(lang).survey;
  return survey
    .map((q) => {
      const a = answers[q.id];
      return a ? `${q.prompt} → ${a}` : null;
    })
    .filter(Boolean)
    .join('\n');
}

export type { ClosureBundle, ClosureSurveyQuestion } from './types';
