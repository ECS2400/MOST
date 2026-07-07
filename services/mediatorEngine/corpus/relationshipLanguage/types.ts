export type RelationshipLanguageCategory = 'hurt';

export type RelationshipLanguageIntensity = 1 | 2 | 3 | 4 | 5;

export interface RelationshipLanguageEntry {
  id: string;
  category: RelationshipLanguageCategory;
  intensity: RelationshipLanguageIntensity;
  text: string;
  tags: string[];
}
