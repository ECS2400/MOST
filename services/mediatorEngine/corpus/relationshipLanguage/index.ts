export type {
  RelationshipLanguageCategory,
  RelationshipLanguageEntry,
  RelationshipLanguageIntensity,
} from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';
export { ANGER_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/anger';
export { WITHDRAWAL_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/withdrawal';
export { DEFENSIVENESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/defensiveness';

import { ANGER_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/anger';
import { DEFENSIVENESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/defensiveness';
import { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';
import { WITHDRAWAL_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/withdrawal';
import type { RelationshipLanguageEntry } from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export const RELATIONSHIP_LANGUAGE_CORPUS: readonly RelationshipLanguageEntry[] = [
  ...HURT_ENTRIES,
  ...ANGER_ENTRIES,
  ...WITHDRAWAL_ENTRIES,
  ...DEFENSIVENESS_ENTRIES,
] as const;
