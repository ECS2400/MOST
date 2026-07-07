export type {
  RelationshipLanguageCategory,
  RelationshipLanguageEntry,
  RelationshipLanguageIntensity,
} from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';
export { ANGER_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/anger';
export { WITHDRAWAL_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/withdrawal';
export { DEFENSIVENESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/defensiveness';
export { CRITICISM_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/criticism';
export { FEAR_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/fear';
export { SHAME_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/shame';
export { LONELINESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/loneliness';
export { REPAIR_ATTEMPT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/repairAttempt';
export { VALIDATION_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/validation';

import { ANGER_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/anger';
import { CRITICISM_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/criticism';
import { DEFENSIVENESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/defensiveness';
import { FEAR_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/fear';
import { HURT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/hurt';
import { LONELINESS_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/loneliness';
import { REPAIR_ATTEMPT_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/repairAttempt';
import { VALIDATION_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/validation';
import { SHAME_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/shame';
import { WITHDRAWAL_ENTRIES } from '@/services/mediatorEngine/corpus/relationshipLanguage/withdrawal';
import type { RelationshipLanguageEntry } from '@/services/mediatorEngine/corpus/relationshipLanguage/types';

export const RELATIONSHIP_LANGUAGE_CORPUS: readonly RelationshipLanguageEntry[] = [
  ...HURT_ENTRIES,
  ...ANGER_ENTRIES,
  ...WITHDRAWAL_ENTRIES,
  ...DEFENSIVENESS_ENTRIES,
  ...CRITICISM_ENTRIES,
  ...FEAR_ENTRIES,
  ...SHAME_ENTRIES,
  ...LONELINESS_ENTRIES,
  ...REPAIR_ATTEMPT_ENTRIES,
  ...VALIDATION_ENTRIES,
] as const;
