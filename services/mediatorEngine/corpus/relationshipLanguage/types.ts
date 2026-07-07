export type RelationshipLanguageCategory =
  | 'hurt'
  | 'anger'
  | 'withdrawal'
  | 'defensiveness'
  | 'criticism'
  | 'fear'
  | 'shame'
  | 'loneliness'
  | 'repair_attempt'
  | 'validation'
  | 'apology';

export type RelationshipLanguageIntensity = 1 | 2 | 3 | 4 | 5;

export interface RelationshipLanguageEntry {
  id: string;
  category: RelationshipLanguageCategory;
  intensity: RelationshipLanguageIntensity;
  text: string;
  tags: string[];
  likelyEmotion?: string;
  likelyNeed?: string;
}
