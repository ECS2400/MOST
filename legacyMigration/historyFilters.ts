/**
 * Read-only filters for historical live_messages rows.
 * Not imported by production Live Mediation runtime paths.
 */

export const HISTORICAL_CONVERSATION_STATE_ACTION = 'conversation_state';

export interface HistoricalMessageLike {
  message_type?: string;
  metadata?: {
    action?: string;
    state?: unknown;
  } | null;
}

/** Historical legacy engine row (conversation_state action or type). */
export function isHistoricalLegacyMessage(message: HistoricalMessageLike): boolean {
  return isHistoricalConversationStateMessage(message);
}

/** Historical conversation_state row from the legacy engine. */
export function isHistoricalConversationStateMessage(message: HistoricalMessageLike): boolean {
  return (
    message.message_type === HISTORICAL_CONVERSATION_STATE_ACTION ||
    message.metadata?.action === HISTORICAL_CONVERSATION_STATE_ACTION
  );
}

/** Returns true when a conversation_state row exists but lacks a state payload. */
export function isBrokenHistoricalConversationStateMessage(
  message: HistoricalMessageLike
): boolean {
  return isHistoricalConversationStateMessage(message) && message.metadata?.state == null;
}
