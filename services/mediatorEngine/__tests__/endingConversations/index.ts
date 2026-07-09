/**
 * Ending Conversations — scenariusze jakości domknięcia mediacji (Phase 5J).
 * Osobny rejestr; nie mieszać z GOLDEN_CONVERSATIONS (Phase 5I).
 */

export type {
  EndingConceptExpectation,
  EndingConversation,
} from '@/services/mediatorEngine/__tests__/endingConversations/types';

export { futurePlanningEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/future-planning-ending';
export { brokenPromisesEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/broken-promises-ending';
export { recurringArgumentsEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/recurring-arguments-ending';

import { brokenPromisesEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/broken-promises-ending';
import { futurePlanningEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/future-planning-ending';
import { recurringArgumentsEndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/recurring-arguments-ending';
import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';

/** Wszystkie scenariusze ending benchmark (Phase 5J). */
export const ENDING_CONVERSATIONS: readonly EndingConversation[] = [
  futurePlanningEndingConversation,
  brokenPromisesEndingConversation,
  recurringArgumentsEndingConversation,
] as const;
