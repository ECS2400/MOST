import type {
  ParticipantRole,
  RuntimeClientEvent,
  RuntimeClientEventKind,
} from '@/types/mediator';

export type RuntimeClientEventAction = Extract<
  RuntimeClientEventKind,
  | 'continue_session'
  | 'start_extension'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'resolve_session'
>;

/** Builds one validated client event for a live decision-panel action. */
export function buildRuntimeClientEvents(
  action: RuntimeClientEventAction,
  actor: ParticipantRole,
  at: string = new Date().toISOString()
): RuntimeClientEvent[] {
  return [
    {
      kind: action,
      actor,
      at,
    },
  ];
}

/** Records a participant chat reply for the next runtime turn. */
export function buildParticipantReplyClientEvents(
  actor: ParticipantRole,
  at: string = new Date().toISOString()
): RuntimeClientEvent[] {
  return [
    {
      kind: actor === 'host' ? 'host_message' : 'partner_message',
      actor,
      at,
    },
  ];
}
