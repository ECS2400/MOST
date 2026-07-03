import type { ImageSourcePropType } from 'react-native';

/** 10 lokalnych zdjęć (Unsplash) — działają offline. Rotacja: index % 10 */
export const KNOWLEDGE_IMAGES: ImageSourcePropType[] = [
  require('@/assets/knowledge/knowledge-01.jpg'),
  require('@/assets/knowledge/knowledge-02.jpg'),
  require('@/assets/knowledge/knowledge-03.jpg'),
  require('@/assets/knowledge/knowledge-04.jpg'),
  require('@/assets/knowledge/knowledge-05.jpg'),
  require('@/assets/knowledge/knowledge-06.jpg'),
  require('@/assets/knowledge/knowledge-07.jpg'),
  require('@/assets/knowledge/knowledge-08.jpg'),
  require('@/assets/knowledge/knowledge-09.jpg'),
  require('@/assets/knowledge/knowledge-10.jpg'),
];

export function getKnowledgeImage(index: number): ImageSourcePropType {
  const safe = ((index % KNOWLEDGE_IMAGES.length) + KNOWLEDGE_IMAGES.length) % KNOWLEDGE_IMAGES.length;
  return KNOWLEDGE_IMAGES[safe];
}
