import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface ApplyAiTurnDevLogMessage {
  id: string;
  sender_id: string;
  message_type: string;
}

export type ApplyAiTurnTriggerSource =
  | 'bootstrap'
  | 'generate_next'
  | 'answer_ack'
  | 'runtime_client_action'
  | 'extension_start'
  | 'proposed_solution'
  | 'explicit_ui'
  | 'unknown';

export interface ApplyAiTurnDevLogPayload {
  triggerSource: ApplyAiTurnTriggerSource;
  nextBeat: string;
  pending: string;
  hasNewMessages: boolean;
  bothAnswered: boolean;
  runtimeFailed: boolean;
}

export function resolveApplyAiTurnTriggerSource(
  mode: string,
  triggerMessage: { metadata?: Record<string, unknown> | null }
): ApplyAiTurnTriggerSource {
  if (triggerMessage.metadata?.bootstrap === true || mode === 'opening_summary') {
    return 'bootstrap';
  }
  if (triggerMessage.metadata?.generateNext === true || mode === 'generate_question') {
    return 'generate_next';
  }
  if (mode === 'answer_ack') {
    return 'answer_ack';
  }
  if (triggerMessage.metadata?.runtimeClientAction) {
    return 'runtime_client_action';
  }
  if (triggerMessage.metadata?.extensionStart === true) {
    return 'extension_start';
  }
  if (mode === 'proposed_solution') {
    return 'proposed_solution';
  }
  return 'unknown';
}

export function buildApplyAiTurnDevLogPayload(params: {
  triggerSource: ApplyAiTurnTriggerSource;
  runtimeSession?: RuntimeSession | null;
  messages: ApplyAiTurnDevLogMessage[];
  previousMessageCount: number;
  hostUserId: string;
  partnerUserIds: string[];
  runtimeFailed: boolean;
}): ApplyAiTurnDevLogPayload {
  const {
    triggerSource,
    runtimeSession,
    messages,
    previousMessageCount,
    hostUserId,
    partnerUserIds,
    runtimeFailed,
  } = params;

  const bothAnswered = (() => {
    const lastQuestion = [...messages]
      .reverse()
      .find((message) => message.sender_id === 'ai' && message.message_type === 'question');
    if (!lastQuestion) return false;
    const questionIndex = messages.findIndex((message) => message.id === lastQuestion.id);
    const after = messages.slice(questionIndex + 1);
    const hostReplied = after.some(
      (message) => message.message_type === 'message' && message.sender_id === hostUserId
    );
    const partnerReplied = after.some(
      (message) =>
        message.message_type === 'message' && partnerUserIds.includes(message.sender_id)
    );
    return hostReplied && partnerReplied;
  })();

  return {
    triggerSource,
    nextBeat: runtimeSession?.decision.nextBeat ?? 'none',
    pending: runtimeSession?.pending.awaiting ?? 'none',
    hasNewMessages: messages.length !== previousMessageCount,
    bothAnswered,
    runtimeFailed,
  };
}

export function logApplyAiTurnDev(payload: ApplyAiTurnDevLogPayload): void {
  if (!__DEV__) return;
  console.log('[applyAiTurn]', payload);
}

/** Detects whether a silent sync merged new remote messages. */
export function silentSyncDetectedNewMessages(
  mergedLength: number,
  currentLength: number,
  mergedLastId: string | undefined,
  currentLastId: string | undefined
): boolean {
  return mergedLength !== currentLength || mergedLastId !== currentLastId;
}
