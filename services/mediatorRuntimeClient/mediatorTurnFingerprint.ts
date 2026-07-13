import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface MediatorTurnFingerprintMessage {
  id: string;
  message_type: string;
}

export interface MediatorTurnFingerprintInput {
  mediationId: string;
  mode: string;
  messages: MediatorTurnFingerprintMessage[];
  runtimeSession?: RuntimeSession | null;
  questionIndex?: number;
}

function countAskedQuestions(messages: MediatorTurnFingerprintMessage[]): number {
  return messages.filter((message) => message.message_type === 'question').length;
}

/** Stable key for deduplicating identical auto-generation attempts. */
export function buildMediatorTurnFingerprint(
  input: MediatorTurnFingerprintInput
): string {
  const { mediationId, mode, messages, runtimeSession, questionIndex } = input;
  const turn = questionIndex ?? countAskedQuestions(messages);
  const nextBeat = runtimeSession?.decision.nextBeat ?? 'none';
  const pending = runtimeSession?.pending.awaiting ?? 'none';
  const messageIds = messages.map((message) => message.id).join(',');
  return `${mediationId}|${mode}|${turn}|${nextBeat}|${pending}|${messageIds}`;
}

export function isDuplicateMediatorTurnFingerprint(
  fingerprint: string,
  lastFingerprint: string | null | undefined
): boolean {
  return Boolean(lastFingerprint) && fingerprint === lastFingerprint;
}
