export interface OpeningBootstrapMessage {
  id: string;
  sender_id: string;
  message_type: string;
  content: string;
  metadata?: {
    summaryKind?: string;
    questionId?: string;
    openingSummaryDone?: boolean;
  };
}

export interface OpeningBootstrapConversationState {
  openingSummaryDone?: boolean;
}

export function extractOpeningQuestionBare(content: string): string {
  const text = typeof content === 'string' ? content : String(content ?? '');
  return text.replace(/^🎯\s*@[^:]+:\s*/i, '').trim();
}

export function hasOpeningSummaryMessage(messages: OpeningBootstrapMessage[]): boolean {
  return messages.some(
    (message) =>
      message.sender_id === 'ai' &&
      (message.message_type === 'summary' ||
        message.metadata?.summaryKind === 'opening_summary' ||
        message.metadata?.summaryKind === 'opening')
  );
}

export function hasOpeningFactsQuestion(messages: OpeningBootstrapMessage[]): boolean {
  return messages.some(
    (message) =>
      message.sender_id === 'ai' &&
      message.message_type === 'question' &&
      (message.metadata?.questionId === 'gap_facts' ||
        extractOpeningQuestionBare(message.content).toLowerCase().includes('konkretne wydarzenie') ||
        extractOpeningQuestionBare(message.content).toLowerCase().includes('concrete event'))
  );
}

/** Any AI-delivered opening turn (summary or first question) — runtime or legacy. */
export function hasMediatorOpeningDelivered(messages: OpeningBootstrapMessage[]): boolean {
  return messages.some(
    (message) =>
      message.sender_id === 'ai' &&
      (message.message_type === 'question' ||
        message.message_type === 'summary' ||
        message.metadata?.summaryKind === 'opening_summary' ||
        message.metadata?.summaryKind === 'opening')
  );
}

export function shouldSkipOpeningBootstrap(
  messages: OpeningBootstrapMessage[],
  conversationState?: OpeningBootstrapConversationState | null
): boolean {
  return (
    hasOpeningSummaryMessage(messages) ||
    hasOpeningFactsQuestion(messages) ||
    hasMediatorOpeningDelivered(messages) ||
    Boolean(conversationState?.openingSummaryDone)
  );
}
