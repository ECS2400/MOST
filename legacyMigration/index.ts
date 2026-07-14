export {
  HISTORICAL_CONVERSATION_STATE_ACTION,
  isHistoricalConversationStateMessage,
  isHistoricalLegacyMessage,
  isBrokenHistoricalConversationStateMessage,
} from '@/legacyMigration/historyFilters';
export type { HistoricalMessageLike } from '@/legacyMigration/historyFilters';

export {
  LEGACY_CONVERSATION_STATE_ACTION,
  isLegacyConversationStateMessage,
  readLegacyConversationStateFromMessages,
} from '@/legacyMigration/conversationState';
export type {
  LegacyConversationState,
  LegacyIdentifiedGap,
  LegacyMigrationMessage,
} from '@/legacyMigration/conversationState';

export {
  computeLegacyLiveSessionFlow,
  LEGACY_ALTERNATIVE_SOLUTION_KIND,
  LEGACY_EXTENSION_START_ACTION,
  LEGACY_LIVE_EXTENSION_QUESTIONS,
  LEGACY_LIVE_QUESTIONS_TARGET,
  LEGACY_PROPOSAL_ACCEPTED_FINAL_KIND,
} from '@/legacyMigration/sessionFlow';
export type {
  LegacyLiveQuestionPhase,
  LegacyLiveSessionFlow,
  LegacyLiveSessionStage,
  LegacyMigrationLiveMessage,
} from '@/legacyMigration/sessionFlow';
