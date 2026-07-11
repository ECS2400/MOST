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
