export type { KnowledgeArticle, KnowledgeAudience } from './types';
export { getKnowledgeImage, KNOWLEDGE_IMAGES } from './images';
export type { KnowledgeArticleDefinition } from './locales';
export {
  getKnowledgeArticlesForLanguage,
  getKnowledgeTopicsForLanguage,
  KNOWLEDGE_TOPICS,
} from './locales';

import type { Language } from '@/constants/i18n';
import {
  getKnowledgeArticlesForLanguage,
  getKnowledgeTopicsForLanguage,
} from './locales';
import type { KnowledgeAudience, KnowledgeArticle } from './types';

export function getKnowledgeArticles(
  audience: KnowledgeAudience,
  lang: Language = 'pl'
): KnowledgeArticle[] {
  return getKnowledgeArticlesForLanguage(lang, audience);
}

export function getKnowledgeTopics(lang: Language = 'pl'): readonly string[] {
  return getKnowledgeTopicsForLanguage(lang);
}
