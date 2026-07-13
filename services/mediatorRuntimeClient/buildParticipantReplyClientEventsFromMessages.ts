import type { RuntimeClientEvent } from '@/types/mediator';
import type { ParticipantReplyDerivedState } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

/** Builds runtime client events for all replies observed in live_messages. */
export function buildParticipantReplyClientEventsFromMessages(
  derived: ParticipantReplyDerivedState,
  at: string = new Date().toISOString()
): RuntimeClientEvent[] {
  if (derived.questionTurn == null) {
    return [];
  }

  const events: RuntimeClientEvent[] = [];

  if (derived.hostReplied) {
    events.push({
      kind: 'host_message',
      actor: 'host',
      at,
      metadata: { questionTurn: derived.questionTurn },
    });
  }

  if (derived.partnerReplied) {
    events.push({
      kind: 'partner_message',
      actor: 'partner',
      at,
      metadata: { questionTurn: derived.questionTurn },
    });
  }

  return events;
}
