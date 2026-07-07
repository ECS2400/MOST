export type {
  RelationshipLanguageCategory,
  RelationshipLanguageEntry,
  RelationshipLanguageIntensity,
} from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';

import { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';
import type { RelationshipLanguageEntry } from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export const RELATIONSHIP_LANGUAGE_CORPUS: readonly RelationshipLanguageEntry[] = [
  ...HURT_ENTRIES,
] as const;
