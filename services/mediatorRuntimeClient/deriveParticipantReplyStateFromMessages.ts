export interface ParticipantReplyMessage {
  id: string;
  sender_id: string;
  message_type: string;
  metadata?: {
    replyToQuestionId?: string | null;
    simulated?: boolean;
  } | null;
}

export interface DeriveParticipantReplyStateInput {
  messages: ParticipantReplyMessage[];
  currentQuestionTurn?: number | null;
  hostUserId: string;
  partnerUserIds: string[];
}

export interface ParticipantReplyDerivedState {
  hostReplied: boolean;
  partnerReplied: boolean;
  bothReplied: boolean;
  questionTurn: number | null;
  lastQuestionId: string | null;
  lastMediatorQuestionId: string | null;
  hostReplyMessageId: string | null;
  partnerReplyMessageId: string | null;
  triggerReason: string;
}

function normalizePartnerUserIds(hostUserId: string, partnerUserIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const partnerId of partnerUserIds) {
    if (!partnerId || partnerId === hostUserId || seen.has(partnerId)) {
      continue;
    }
    seen.add(partnerId);
    normalized.push(partnerId);
  }
  return normalized;
}

/** Last AI mediator question — only sender_id=ai counts as a reply checkpoint. */
export function getLastMediatorQuestionMessage(
  messages: ParticipantReplyMessage[]
): ParticipantReplyMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.message_type === 'question' && message.sender_id === 'ai') {
      return message;
    }
  }
  return null;
}

import { resolveQuestionTurnFromMessages } from '@/services/mediatorRuntimeClient/resolveQuestionTurnFromMessages';

function getMessagesAfterQuestion(
  messages: ParticipantReplyMessage[],
  question: ParticipantReplyMessage | null
): ParticipantReplyMessage[] {
  if (!question) {
    return [];
  }
  const index = messages.findIndex((message) => message.id === question.id);
  if (index < 0) {
    return [];
  }
  return messages.slice(index + 1);
}

function resolveReplyRole(
  message: ParticipantReplyMessage,
  lastQuestionId: string,
  hostUserId: string,
  partnerUserIds: string[]
): 'host' | 'partner' | null {
  if (message.message_type !== 'message') {
    return null;
  }
  if (message.sender_id === 'ai') {
    return null;
  }

  const replyToQuestionId = message.metadata?.replyToQuestionId;
  if (
    typeof replyToQuestionId === 'string' &&
    replyToQuestionId.trim() &&
    replyToQuestionId !== lastQuestionId
  ) {
    return null;
  }

  if (message.sender_id === hostUserId) {
    return 'host';
  }

  if (partnerUserIds.includes(message.sender_id)) {
    return 'partner';
  }

  return null;
}

function findFirstReplyForRole(
  afterQuestion: ParticipantReplyMessage[],
  role: 'host' | 'partner',
  lastQuestionId: string,
  hostUserId: string,
  partnerUserIds: string[]
): ParticipantReplyMessage | null {
  for (const message of afterQuestion) {
    if (resolveReplyRole(message, lastQuestionId, hostUserId, partnerUserIds) === role) {
      return message;
    }
  }
  return null;
}

function resolveTriggerReason(input: {
  lastQuestion: ParticipantReplyMessage | null;
  hostReplied: boolean;
  partnerReplied: boolean;
  bothReplied: boolean;
}): string {
  if (!input.lastQuestion) {
    return 'no_mediator_question';
  }
  if (input.bothReplied) {
    return 'both_replied_same_question';
  }
  if (input.hostReplied && input.partnerReplied) {
    return 'both_replied_same_question';
  }
  if (input.hostReplied) {
    return 'host_only';
  }
  if (input.partnerReplied) {
    return 'partner_only';
  }
  return 'awaiting_replies';
}

/** Source of truth for participant replies — derived from persisted live_messages. */
export function deriveParticipantReplyStateFromMessages(
  input: DeriveParticipantReplyStateInput
): ParticipantReplyDerivedState {
  const partnerUserIds = normalizePartnerUserIds(input.hostUserId, input.partnerUserIds);
  const lastQuestion = getLastMediatorQuestionMessage(input.messages);
  const lastQuestionId = lastQuestion?.id ?? null;
  const after = getMessagesAfterQuestion(input.messages, lastQuestion);

  const hostReply = lastQuestionId
    ? findFirstReplyForRole(after, 'host', lastQuestionId, input.hostUserId, partnerUserIds)
    : null;
  const partnerReply = lastQuestionId
    ? findFirstReplyForRole(after, 'partner', lastQuestionId, input.hostUserId, partnerUserIds)
    : null;

  const hostReplied = Boolean(hostReply);
  const partnerReplied = Boolean(partnerReply);
  const bothReplied = Boolean(lastQuestion && hostReplied && partnerReplied);

  const questionTurn = resolveQuestionTurnFromMessages(
    input.messages,
    input.currentQuestionTurn ?? null
  );

  const triggerReason = resolveTriggerReason({
    lastQuestion,
    hostReplied,
    partnerReplied,
    bothReplied,
  });

  return {
    hostReplied,
    partnerReplied,
    bothReplied,
    questionTurn,
    lastQuestionId,
    lastMediatorQuestionId: lastQuestionId,
    hostReplyMessageId: hostReply?.id ?? null,
    partnerReplyMessageId: partnerReply?.id ?? null,
    triggerReason,
  };
}
