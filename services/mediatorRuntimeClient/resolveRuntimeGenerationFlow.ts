import {
  resolveRuntimeActionExecution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import type { MediatorMode } from '@/services/liveMediation.types';
import type { MediatorBeat } from '@/types/mediator/runtimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeGenerationFlowReason =
  | 'runtime_available'
  | 'runtime_unavailable'
  | 'runtime_failed'
  | 'unsupported_runtime_beat'
  | 'invalid_runtime_state';

export interface ResolveRuntimeGenerationFlowParams {
  runtimeSession: RuntimeSession | null | undefined;
  runtimeFailed?: boolean;
  invalidRuntimeState?: boolean;
}

export interface RuntimeGenerationFlowResolution {
  mode: MediatorMode | null;
  source: 'runtime_available' | 'runtime_unavailable';
  reason: RuntimeGenerationFlowReason;
}

/** Modes routed directly to processMediationTurn. */
export const RUNTIME_DIRECT_MEDIATOR_MODES: ReadonlySet<MediatorMode> = new Set([
  'opening_summary',
  'proposed_solution',
  'final_summary',
  'extension_check',
  'mid_summary',
  'extension_offer',
  'extension_question',
  'closure',
  'safety_intervention',
]);

const RUNTIME_WAIT_BEATS: ReadonlySet<MediatorBeat> = new Set([
  'await_user_action',
  'deliver_answer_ack',
]);

const QUESTION_GENERATION_MODES: ReadonlySet<MediatorMode> = new Set([
  'generate_question',
  'extension_question',
]);

export function isRuntimeDirectMediatorMode(mode: MediatorMode): boolean {
  return RUNTIME_DIRECT_MEDIATOR_MODES.has(mode);
}

/** Maps runtime nextBeat to MediatorMode — one-to-one, no semantic aliasing. */
export function mapRuntimeBeatToMediatorMode(beat: MediatorBeat): MediatorMode | null {
  switch (beat) {
    case 'deliver_opening':
      return 'opening_summary';
    case 'deliver_question':
      return 'generate_question';
    case 'deliver_answer_ack':
      return 'answer_ack';
    case 'deliver_mid_summary':
      return 'mid_summary';
    case 'deliver_final_summary':
      return 'final_summary';
    case 'deliver_extension_summary':
      return 'extension_check';
    case 'present_proposal':
      return 'proposed_solution';
    case 'offer_extension':
      return 'extension_offer';
    case 'deliver_extension_questions':
      return 'extension_question';
    case 'deliver_closure':
      return 'closure';
    case 'safety_intervention':
      return 'safety_intervention';
    case 'await_user_action':
      return null;
    default:
      return null;
  }
}

function isRuntimeQuestionGenerationBlocked(
  runtimeSession: RuntimeSession,
  mappedMode: MediatorMode
): boolean {
  if (!QUESTION_GENERATION_MODES.has(mappedMode)) {
    return false;
  }

  if (!runtimeSession.decision.mayAutoAdvance) {
    return true;
  }

  switch (runtimeSession.pending.awaiting) {
    case 'host_reply':
    case 'partner_reply':
    case 'both_replies':
    case 'continue_decision':
    case 'extension_decision':
    case 'proposal_decision':
    case 'safety_acknowledgment':
      return true;
    default:
      return false;
  }
}

/**
 * Resolves host-led generation mode from runtimeSession.decision.nextBeat.
 *
 * answer_ack is mapped for diagnostics but never returned for auto-advance —
 * user-message path owns that turn.
 */
export function resolveRuntimeGenerationFlow(
  params: ResolveRuntimeGenerationFlowParams
): RuntimeGenerationFlowResolution {
  const execution = resolveRuntimeActionExecution({
    runtimeSession: params.runtimeSession,
    runtimeFailed: params.runtimeFailed,
    invalidRuntimeState: params.invalidRuntimeState,
  });

  if (execution.runtimeUnavailable) {
    return {
      mode: null,
      source: 'runtime_unavailable',
      reason: execution.reason,
    };
  }

  const runtimeSession = params.runtimeSession!;
  const nextBeat = runtimeSession.decision.nextBeat;

  if (RUNTIME_WAIT_BEATS.has(nextBeat)) {
    return {
      mode: null,
      source: 'runtime_available',
      reason: 'runtime_available',
    };
  }

  const mappedMode = mapRuntimeBeatToMediatorMode(nextBeat);
  if (mappedMode === null) {
    return {
      mode: null,
      source: 'runtime_unavailable',
      reason: 'invalid_runtime_state',
    };
  }

  if (mappedMode === 'answer_ack') {
    return {
      mode: null,
      source: 'runtime_available',
      reason: 'runtime_available',
    };
  }

  if (isRuntimeQuestionGenerationBlocked(runtimeSession, mappedMode)) {
    return {
      mode: null,
      source: 'runtime_available',
      reason: 'runtime_available',
    };
  }

  return {
    mode: mappedMode,
    source: 'runtime_available',
    reason: 'runtime_available',
  };
}

/** DEV-only log for generation flow resolution. */
export function logRuntimeGenerationFlowResolution(
  resolution: RuntimeGenerationFlowResolution,
  runtimeBeat: MediatorBeat | null
): void {
  if (!__DEV__) return;

  const payload = {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
    runtimeBeat,
  };

  if (resolution.source === 'runtime_available') {
    console.log('[RuntimeSession] generationFlow runtime', payload);
    return;
  }

  console.warn('[RuntimeSession] generationFlow unavailable', payload);
}
