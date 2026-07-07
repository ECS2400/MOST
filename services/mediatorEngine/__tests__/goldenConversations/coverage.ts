/**
 * Golden Conversations — zbiorcza macierz pokrycia (Phase 3G.1).
 * Tylko dane; bez runnera i logiki uruchomieniowej.
 */

import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';
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
import type {
  GoldenConversation,
  GoldenConversationDifficulty,
  GoldenConversationSafetyExpectation,
  GoldenConversationStrategy,
} from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import { workOverFamilyConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/work-over-family';

const ALL_GOLDEN_CONVERSATIONS: readonly GoldenConversation[] = [
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

/** Kategoria konfliktu dla macierzy pokrycia. */
export type GoldenConversationConflictCategory =
  | 'finances'
  | 'communication'
  | 'household'
  | 'family'
  | 'trust'
  | 'intimacy'
  | 'parenting'
  | 'work-life'
  | 'life-change'
  | 'habits'
  | 'conflict-pattern';

const CONFLICT_CATEGORY_BY_ID: Record<GoldenConversation['id'], GoldenConversationConflictCategory> =
  {
    'finances-blame': 'finances',
    'lack-of-communication': 'communication',
    'household-chores': 'household',
    'mother-in-law': 'family',
    jealousy: 'trust',
    'social-media': 'communication',
    'ex-partner': 'trust',
    'sex-intimacy': 'intimacy',
    'lack-of-closeness': 'intimacy',
    'parenting-differences': 'parenting',
    'work-over-family': 'work-life',
    relocation: 'life-change',
    'family-boundaries': 'family',
    'money-split': 'finances',
    'hidden-spending': 'finances',
    'alcohol-use': 'habits',
    'recurring-arguments': 'conflict-pattern',
    'silence-after-conflict': 'communication',
    'broken-promises': 'trust',
    'future-planning': 'life-change',
  };

export interface GoldenConversationCoverageRow {
  id: GoldenConversation['id'];
  conflictCategory: GoldenConversationConflictCategory;
  difficulty: GoldenConversationDifficulty;
  therapeuticGoals: TherapeuticGoal[];
  expectedEnding: TherapeuticGoal;
  safetyExpectation: GoldenConversationSafetyExpectation;
  expectedStrategies: GoldenConversationStrategy[];
}

function expectedEnding(goalPath: readonly TherapeuticGoal[]): TherapeuticGoal {
  return goalPath[goalPath.length - 1] ?? 'SAFE_OPENING';
}

/** Zbiorcza macierz pokrycia golden conversations. */
export const GOLDEN_CONVERSATION_COVERAGE: readonly GoldenConversationCoverageRow[] =
  ALL_GOLDEN_CONVERSATIONS.map((conversation) => ({
    id: conversation.id,
    conflictCategory: CONFLICT_CATEGORY_BY_ID[conversation.id],
    difficulty: conversation.difficulty,
    therapeuticGoals: [...conversation.expectedGoalPath],
    expectedEnding: expectedEnding(conversation.expectedGoalPath),
    safetyExpectation: conversation.safetyExpectation,
    expectedStrategies: [...conversation.expectedStrategies],
  }));
