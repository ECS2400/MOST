import type { Language } from '@/constants/i18n';
import type { KnowledgeAudience } from '../types';
import type { KnowledgeArticle } from '../types';
import { KNOWLEDGE_ARTICLES_PL } from './pl';
import { KNOWLEDGE_ARTICLES_EN } from './en';
import { KNOWLEDGE_ARTICLES_DE } from './de';
import { KNOWLEDGE_ARTICLES_FR } from './fr';
import { KNOWLEDGE_ARTICLES_ES } from './es';
import { KNOWLEDGE_ARTICLES_IT } from './it';

export interface KnowledgeArticleDefinition {
  topic: string;
  title: string;
  contentOn: string;
  contentOna: string;
}

export const KNOWLEDGE_TOPICS: Record<Language, readonly string[]> = {
  pl: [
    'Konflikty i kłótnie',
    'Komunikacja',
    'Emocje i uczucia',
    'Zaufanie',
    'Intymność',
    'Praca nad sobą',
    'Codzienność i rutyna',
    'Wsparcie partnera',
    'Granice',
    'Długoterminowa relacja',
  ],
  en: [
    'Conflicts and arguments',
    'Communication',
    'Emotions and feelings',
    'Trust',
    'Intimacy',
    'Personal growth',
    'Daily life and routine',
    'Supporting your partner',
    'Boundaries',
    'Long-term relationship',
  ],
  de: [
    'Konflikte und Streit',
    'Kommunikation',
    'Emotionen und Gefühle',
    'Vertrauen',
    'Intimität',
    'Persönliche Entwicklung',
    'Alltag und Routine',
    'Partner unterstützen',
    'Grenzen',
    'Langfristige Beziehung',
  ],
  fr: [
    'Conflits et disputes',
    'Communication',
    'Émotions et sentiments',
    'Confiance',
    'Intimité',
    'Travail sur soi',
    'Quotidien et routine',
    'Soutenir son partenaire',
    'Limites',
    'Relation à long terme',
  ],
  es: [
    'Conflictos y discusiones',
    'Comunicación',
    'Emociones y sentimientos',
    'Confianza',
    'Intimidad',
    'Trabajo personal',
    'Vida diaria y rutina',
    'Apoyar a la pareja',
    'Límites',
    'Relación a largo plazo',
  ],
  it: [
    'Conflitti e litigi',
    'Comunicazione',
    'Emozioni e sentimenti',
    'Fiducia',
    'Intimità',
    'Crescita personale',
    'Vita quotidiana e routine',
    'Sostenere il partner',
    'Confini',
    'Relazione a lungo termine',
  ],
};

const ARTICLES_BY_LANG: Record<Language, KnowledgeArticleDefinition[]> = {
  pl: KNOWLEDGE_ARTICLES_PL,
  en: KNOWLEDGE_ARTICLES_EN,
  de: KNOWLEDGE_ARTICLES_DE,
  fr: KNOWLEDGE_ARTICLES_FR,
  es: KNOWLEDGE_ARTICLES_ES,
  it: KNOWLEDGE_ARTICLES_IT,
};

export function getKnowledgeArticlesForLanguage(
  lang: Language,
  audience: KnowledgeAudience
): KnowledgeArticle[] {
  const definitions = ARTICLES_BY_LANG[lang] ?? ARTICLES_BY_LANG.pl;
  return definitions.map((def, index) => ({
    id: `${audience}-${index + 1}`,
    title: def.title,
    topic: def.topic,
    content: audience === 'on' ? def.contentOn : def.contentOna,
    imageIndex: index % 10,
  }));
}

export function getKnowledgeTopicsForLanguage(lang: Language): readonly string[] {
  return KNOWLEDGE_TOPICS[lang] ?? KNOWLEDGE_TOPICS.pl;
}
