import { buildParticipantReplyClientEventsFromMessages } from '@/services/mediatorRuntimeClient/buildParticipantReplyClientEventsFromMessages';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import type { RuntimeClientEvent } from '@/types/mediator';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

const REPLY_EVENT_KINDS: ReadonlySet<RuntimeClientEvent['kind']> = new Set([
  'host_message',
  'partner_message',
]);

export interface ResolveRuntimeClientEventsForTurnInput {
  messages: ParticipantReplyMessage[];
  hostUserId: string;
  partnerUserIds: string[];
  runtimeSession?: RuntimeSession | null;
  pendingRefEvents?: RuntimeClientEvent[];
  inlineClientEvents?: RuntimeClientEvent[];
}

/** Merges message-derived reply events with non-reply flow-control events from the ref. */
export function resolveRuntimeClientEventsForTurn(
  input: ResolveRuntimeClientEventsForTurnInput
): RuntimeClientEvent[] | undefined {
  const derived = deriveParticipantReplyStateFromMessages({
    messages: input.messages,
    hostUserId: input.hostUserId,
    partnerUserIds: input.partnerUserIds,
  });

  const replyEvents = buildParticipantReplyClientEventsFromMessages(derived);
  const refMerged = [...(input.pendingRefEvents ?? []), ...(input.inlineClientEvents ?? [])];
  const flowControlEvents = refMerged.filter((event) => !REPLY_EVENT_KINDS.has(event.kind));

  const merged = [...replyEvents, ...flowControlEvents];
  return merged.length > 0 ? merged : undefined;
}
