/**
 * Golden Conversations — biblioteka referencyjnych scenariuszy mediacji (Phase 3G).
 * Tylko dane; bez runnera, testów i logiki uruchomieniowej.
 */

export type {
  GoldenConversation,
  GoldenConversationDifficulty,
  GoldenConversationOutlineTurn,
  GoldenConversationParticipant,
  GoldenConversationSafetyExpectation,
  GoldenConversationStrategy,
  ConversationMessage,
} from '@/services/mediatorEngine/__tests__/goldenConversations/types';

export {
  GOLDEN_CONVERSATION_COVERAGE,
  type GoldenConversationConflictCategory,
  type GoldenConversationCoverageRow,
} from '@/services/mediatorEngine/__tests__/goldenConversations/coverage';

export { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
export { lackOfCommunicationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-communication';
export { householdChoresConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/household-chores';
export { motherInLawConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/mother-in-law';
export { jealousyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/jealousy';
export { socialMediaConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/social-media';
export { exPartnerConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/ex-partner';
export { sexIntimacyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/sex-intimacy';
export { lackOfClosenessConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-closeness';
export { parentingDifferencesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/parenting-differences';
export { workOverFamilyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/work-over-family';
export { relocationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/relocation';
export { familyBoundariesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/family-boundaries';
export { moneySplitConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/money-split';
export { hiddenSpendingConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/hidden-spending';
export { alcoholUseConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/alcohol-use';
export { recurringArgumentsConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/recurring-arguments';
export { silenceAfterConflictConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/silence-after-conflict';
export { brokenPromisesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/broken-promises';
export { futurePlanningConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/future-planning';

import { alcoholUseConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/alcohol-use';
import { brokenPromisesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/broken-promises';
import { exPartnerConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/ex-partner';
import { familyBoundariesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/family-boundaries';
import { financesBlameConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/finances-blame';
import { futurePlanningConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/future-planning';
import { hiddenSpendingConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/hidden-spending';
import { householdChoresConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/household-chores';
import { jealousyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/jealousy';
import { lackOfClosenessConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-closeness';
import { lackOfCommunicationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/lack-of-communication';
import { moneySplitConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/money-split';
import { motherInLawConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/mother-in-law';
import { parentingDifferencesConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/parenting-differences';
import { recurringArgumentsConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/recurring-arguments';
import { relocationConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/relocation';
import { sexIntimacyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/sex-intimacy';
import { silenceAfterConflictConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/silence-after-conflict';
import { socialMediaConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/social-media';
import { workOverFamilyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/work-over-family';
import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';

/** Wszystkie referencyjne scenariusze golden conversations. */
export const GOLDEN_CONVERSATIONS: readonly GoldenConversation[] = [
  financesBlameConversation,
  lackOfCommunicationConversation,
  householdChoresConversation,
  motherInLawConversation,
  jealousyConversation,
  socialMediaConversation,
  exPartnerConversation,
  sexIntimacyConversation,
  lackOfClosenessConversation,
  parentingDifferencesConversation,
  workOverFamilyConversation,
  relocationConversation,
  familyBoundariesConversation,
  moneySplitConversation,
  hiddenSpendingConversation,
  alcoholUseConversation,
  recurringArgumentsConversation,
  silenceAfterConflictConversation,
  brokenPromisesConversation,
  futurePlanningConversation,
] as const;
