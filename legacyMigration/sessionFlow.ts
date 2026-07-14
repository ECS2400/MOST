/**
 * Legacy session-flow inference from message history only.
 * Used by migration/diagnostic tests — not production Live Mediation.
 */

import {
  readLegacyConversationStateFromMessages,
  type LegacyConversationState,
} from '@/legacyMigration/conversationState';

export type LegacyLiveSessionStage =
  | 'questions'
  | 'awaiting_main_decision'
  | 'extension'
  | 'awaiting_extension_decision'
  | 'awaiting_proposal_decision'
  | 'unresolved_but_closed'
  | 'finished';

export type LegacyLiveQuestionPhase = 'opening' | 'deepening' | 'resolution' | 'extension';

export interface LegacyLiveSessionFlow {
  stage: LegacyLiveSessionStage;
  questionNumber: number;
  maxQuestions: number;
  questionPhase: LegacyLiveQuestionPhase;
  extensionActive: boolean;
}

export interface LegacyMigrationLiveMessage {
  id: string;
  sender_id: string;
  message_type: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export const LEGACY_LIVE_QUESTIONS_TARGET = 15;
export const LEGACY_LIVE_EXTENSION_QUESTIONS = 5;
export const LEGACY_EXTENSION_START_ACTION = 'extension_start';
export const LEGACY_PROPOSAL_ACCEPTED_FINAL_KIND = 'proposal_accepted_final';
export const LEGACY_ALTERNATIVE_SOLUTION_KIND = 'alternative_solution';

function hasSummaryKind(messages: LegacyMigrationLiveMessage[], kind: string): boolean {
  return messages.some(
    (message) =>
      (message.message_type === 'summary' || message.message_type === 'system') &&
      message.metadata?.summaryKind === kind
  );
}

function countAskedQuestions(messages: LegacyMigrationLiveMessage[]): number {
  return messages.filter(
    (message) => message.message_type === 'question' && message.sender_id === 'ai'
  ).length;
}

function isExtensionActive(messages: LegacyMigrationLiveMessage[]): boolean {
  return messages.some(
    (message) =>
      message.message_type === 'system' && message.metadata?.action === LEGACY_EXTENSION_START_ACTION
  );
}

function getLegacyQuestionPhase(
  questionNumber: number,
  extensionActive: boolean,
  conversationState: LegacyConversationState | null
): LegacyLiveQuestionPhase {
  if (extensionActive) return 'extension';
  if (conversationState) {
    if (!conversationState.openingSummaryDone || !conversationState.mainConflictQuestionAsked) {
      return 'opening';
    }
    if (conversationState.identifiedGaps.some((gap) => !gap.resolved)) {
      return 'deepening';
    }
    return 'resolution';
  }
  if (questionNumber <= 5) return 'opening';
  if (questionNumber <= 10) return 'deepening';
  return 'resolution';
}

/** Infers legacy session flow from stored messages (migration/diagnostics only). */
export function computeLegacyLiveSessionFlow(
  messages: LegacyMigrationLiveMessage[],
  _hostUserId: string,
  _partnerUserIds: string[]
): LegacyLiveSessionFlow {
  const questionNumber = countAskedQuestions(messages);
  const extensionActive = isExtensionActive(messages);
  const conversationState = readLegacyConversationStateFromMessages(messages);
  const baseBudget = LEGACY_LIVE_QUESTIONS_TARGET;
  const maxQuestions = extensionActive ? baseBudget + LEGACY_LIVE_EXTENSION_QUESTIONS : baseBudget;

  if (hasSummaryKind(messages, 'proposed_solution')) {
    if (hasSummaryKind(messages, LEGACY_ALTERNATIVE_SOLUTION_KIND)) {
      return {
        stage: 'unresolved_but_closed',
        questionNumber,
        maxQuestions,
        questionPhase: getLegacyQuestionPhase(questionNumber, extensionActive, conversationState),
        extensionActive,
      };
    }
    if (hasSummaryKind(messages, LEGACY_PROPOSAL_ACCEPTED_FINAL_KIND)) {
      return {
        stage: 'finished',
        questionNumber,
        maxQuestions,
        questionPhase: getLegacyQuestionPhase(questionNumber, extensionActive, conversationState),
        extensionActive,
      };
    }
    return {
      stage: 'awaiting_proposal_decision',
      questionNumber,
      maxQuestions,
      questionPhase: getLegacyQuestionPhase(questionNumber, extensionActive, conversationState),
      extensionActive,
    };
  }

  if (hasSummaryKind(messages, 'final_summary') && !extensionActive) {
    return {
      stage: 'awaiting_main_decision',
      questionNumber,
      maxQuestions: baseBudget,
      questionPhase: 'resolution',
      extensionActive: false,
    };
  }

  if (extensionActive) {
    return {
      stage: questionNumber >= baseBudget + LEGACY_LIVE_EXTENSION_QUESTIONS ? 'awaiting_extension_decision' : 'extension',
      questionNumber,
      maxQuestions,
      questionPhase: 'extension',
      extensionActive: true,
    };
  }

  return {
    stage: 'questions',
    questionNumber,
    maxQuestions: baseBudget,
    questionPhase: getLegacyQuestionPhase(questionNumber, false, conversationState),
    extensionActive: false,
  };
}
