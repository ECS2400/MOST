/**
 * Read-only helpers for historical live_messages rows that used legacy
 * conversation_state metadata. Not imported by production Live Mediation.
 */

export const LEGACY_CONVERSATION_STATE_ACTION = 'conversation_state';

export type LegacyConversationPhase =
  | 'summary'
  | 'gap_exploration'
  | 'responsibility'
  | 'repair';

export interface LegacyIdentifiedGap {
  id: string;
  description: string;
  resolved: boolean;
  discussionRounds: number;
  priority?: number;
  resolutionReason?: string;
  confidence?: number;
  deadlocked?: boolean;
  resolvedByMutualUnderstanding?: boolean;
}

export interface LegacyConversationState {
  phase: LegacyConversationPhase;
  identifiedGaps: LegacyIdentifiedGap[];
  activeGapId: string | null;
  openingSummaryDone: boolean;
  mainConflictQuestionAsked: boolean;
  perspectiveA: string;
  perspectiveB: string;
  mainConflict: string;
  coveredTopics: string[];
  lastQuestionSignature: string;
  escalationLevel: number;
  questionCount: number;
  responsibilityQuestionsAsked: number;
  repairQuestionsAsked: number;
  sessionQuestionBudget: number;
  midSummaryShown: boolean;
  responsibilityReady: boolean;
  responsibilityComplete: boolean;
  repairComplete: boolean;
  midSummaryEligible: boolean;
  conversationFinished: boolean;
  currentQuestion?: {
    id: string;
    phase: string;
    topic: string;
    askedAtQuestionNumber: number;
    answered: boolean;
  };
  finalCommitments?: {
    partnerA?: string;
    partnerB?: string;
    sharedRule?: string;
    fallbackPlan?: string;
  };
}

export interface LegacyMigrationMessage {
  metadata?: {
    action?: string;
    state?: unknown;
  } | null;
}

export function isLegacyConversationStateMessage(message: LegacyMigrationMessage): boolean {
  return message.metadata?.action === LEGACY_CONVERSATION_STATE_ACTION;
}

export function readLegacyConversationStateFromMessages(
  messages: LegacyMigrationMessage[]
): LegacyConversationState | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      isLegacyConversationStateMessage(message) &&
      message.metadata?.state &&
      typeof message.metadata.state === 'object'
    ) {
      return message.metadata.state as LegacyConversationState;
    }
  }
  return null;
}
