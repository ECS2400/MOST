export type KnowledgeAudience = 'on' | 'ona';

export interface KnowledgeArticle {
  id: string;
  title: string;
  topic: string;
  content: string;
  imageIndex: number;
}
