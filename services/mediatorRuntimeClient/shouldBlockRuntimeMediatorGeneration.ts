import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import { isRuntimeDirectMediatorMode } from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import type { MediatorMode } from '@/services/liveMediation';
import type { RuntimeClientEvent, RuntimeSession } from '@/types/mediator/runtimeSession';

const FLOW_CONTROL_CLIENT_EVENT_KINDS: ReadonlySet<RuntimeClientEvent['kind']> = new Set([
  'continue_session',
  'start_extension',
  'proposal_accepted',
  'proposal_rejected',
  'resolve_session',
]);

const PUBLIC_MEDIATOR_MODES: ReadonlySet<MediatorMode> = new Set([
  'opening_summary',
  'generate_question',
  'extension_question',
  'mid_summary',
  'final_summary',
  'extension_check',
  'proposed_solution',
  'extension_offer',
  'closure',
  'safety_intervention',
]);

export interface ShouldBlockRuntimeMediatorGenerationParams {
  runtimeSession: RuntimeSession | null | undefined;
  mode: MediatorMode;
  force?: boolean;
  clientEvents?: RuntimeClientEvent[];
  /** Opening bootstrap on a fresh session — only bypass when explicitly allowed. */
  allowOpeningBootstrap?: boolean;
}

function hasFlowControlClientEvents(clientEvents?: RuntimeClientEvent[]): boolean {
  return (
    clientEvents?.some((event) => FLOW_CONTROL_CLIENT_EVENT_KINDS.has(event.kind)) ?? false
  );
}

function isPublicMediatorMode(mode: MediatorMode): boolean {
  return PUBLIC_MEDIATOR_MODES.has(mode) || isRuntimeDirectMediatorMode(mode);
}

/**
 * Blocks mediator turns that would emit chat-visible output while runtime waits
 * for participants or explicit panel decisions.
 */
export function shouldBlockRuntimeMediatorGeneration(
  params: ShouldBlockRuntimeMediatorGenerationParams
): boolean {
  const { runtimeSession, mode, force, clientEvents, allowOpeningBootstrap } = params;

  if (!hasRuntimeSession(runtimeSession)) {
    return isPublicMediatorMode(mode);
  }

  if (force && hasFlowControlClientEvents(clientEvents)) {
    return false;
  }

  if (mode === 'opening_summary' && allowOpeningBootstrap) {
    if (runtimeSession.decision.nextBeat === 'deliver_opening') {
      return false;
    }
    if (
      runtimeSession.decision.nextBeat === 'await_user_action' ||
      runtimeSession.pending.awaiting !== 'nothing'
    ) {
      return true;
    }
    return false;
  }

  if (runtimeSession.decision.nextBeat === 'await_user_action') {
    return isPublicMediatorMode(mode);
  }

  if (runtimeSession.pending.awaiting !== 'nothing') {
    return isPublicMediatorMode(mode);
  }

  if (!runtimeSession.decision.mayAutoAdvance && isPublicMediatorMode(mode)) {
    return true;
  }

  return false;
}
