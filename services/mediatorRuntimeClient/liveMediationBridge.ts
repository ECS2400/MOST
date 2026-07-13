import type {
  MediationState,
  MediatorLang,
  OrchestrateTurnTrigger,
  RuntimeClientEvent,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';
import type { MediatorMode } from '@/services/liveMediation';
import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import {
  isMediatorRuntimeClientError,
  type MediatorRuntimeClientErrorKind,
} from '@/services/mediatorRuntimeClient/errors';

const SUPPORTED_RUNTIME_LANGUAGES: MediatorLang[] = ['pl', 'en', 'es', 'it', 'de', 'fr'];

export type LiveSenderRole = 'user' | 'partner' | 'ai';

/** Params derived from liveMediation turn context — no v2.3 state synthesis. */
export interface LiveRuntimeTurnParams {
  mediationId: string;
  sessionId: string;
  triggerMessageId: string;
  triggerContent: string;
  triggerCreatedAt: string;
  mode: MediatorMode;
  senderRole: LiveSenderRole;
  language: unknown;
  turnNumber: number;
  isBootstrap?: boolean;
  mediationState?: MediationState | null;
  sessionMemory?: SessionMemory | null;
  clientEvents?: RuntimeClientEvent[];
}

/** Maps app language to mediator-runtime language with en fallback (not pl). */
export function toRuntimeLanguage(raw: unknown): MediatorLang {
  if (typeof raw !== 'string') return 'en';
  const key = raw.trim().toLowerCase();
  if (SUPPORTED_RUNTIME_LANGUAGES.includes(key as MediatorLang)) {
    return key as MediatorLang;
  }
  return 'en';
}

const HOST_GENERATE_MODES: ReadonlySet<MediatorMode> = new Set([
  'generate_question',
  'mid_summary',
  'final_summary',
  'extension_check',
  'proposed_solution',
  'extension_offer',
  'extension_question',
  'closure',
  'safety_intervention',
]);

/** Maps live mediator mode + sender to orchestrate_turn trigger. */
export function resolveRuntimeTrigger(
  mode: MediatorMode,
  senderRole: LiveSenderRole,
  isBootstrap?: boolean
): OrchestrateTurnTrigger {
  if (mode === 'opening_summary' || isBootstrap) return 'session_start';
  if (HOST_GENERATE_MODES.has(mode)) {
    return 'host_generate';
  }
  if (mode === 'answer_ack') {
    return 'partner_message';
  }
  if (senderRole === 'partner') return 'partner_message';
  return 'partner_message';
}

function buildTranscriptDelta(params: LiveRuntimeTurnParams): TranscriptMessage[] {
  const content = params.triggerContent.trim();
  if (!content) return [];

  const authorRole =
    params.senderRole === 'partner'
      ? 'partner'
      : params.senderRole === 'user'
        ? 'host'
        : null;

  if (!authorRole) return [];

  return [
    {
      id: params.triggerMessageId,
      authorRole,
      content,
      turnNumber: params.turnNumber,
      createdAt: params.triggerCreatedAt,
    },
  ];
}

/** Builds mediator-runtime client input from live mediation turn data. */
export function buildLiveRuntimeTurnInput(
  params: LiveRuntimeTurnParams
): MediatorRuntimeClientInput {
  return {
    mediationId: params.mediationId,
    sessionId: params.sessionId,
    turnNumber: Math.max(1, params.turnNumber),
    trigger: resolveRuntimeTrigger(params.mode, params.senderRole, params.isBootstrap),
    mediationState: params.mediationState ?? null,
    sessionMemory: params.sessionMemory ?? null,
    transcriptDelta: buildTranscriptDelta(params),
    language: toRuntimeLanguage(params.language),
    clientEvents: params.clientEvents,
  };
}

export interface LiveMediatorRoutingDeps<T> {
  callRuntime: (input: MediatorRuntimeClientInput) => Promise<T>;
  onRuntimeFailure: (error: unknown) => void;
}

/** Routes a live turn to mediator-runtime; failures return null for local fallback. */
export async function routeLiveMediatorTurn<T>(
  runtimeInput: MediatorRuntimeClientInput,
  deps: LiveMediatorRoutingDeps<T>
): Promise<T | null> {
  try {
    return await deps.callRuntime(runtimeInput);
  } catch (error) {
    deps.onRuntimeFailure(error);
    return null;
  }
}

/** Sanitized rollout failure payload — no transcript, prompts, or error messages. */
export interface MediatorRuntimeRolloutFailurePayload {
  enginePath: 'runtime';
  kind: MediatorRuntimeClientErrorKind | 'unknown';
  status?: number;
}

export type MediatorRuntimeRolloutFailureLogger = (
  payload: MediatorRuntimeRolloutFailurePayload
) => void;

function buildRolloutFailurePayload(error: unknown): MediatorRuntimeRolloutFailurePayload {
  const payload: MediatorRuntimeRolloutFailurePayload = {
    enginePath: 'runtime',
    kind: isMediatorRuntimeClientError(error) ? error.kind : 'unknown',
  };

  if (isMediatorRuntimeClientError(error) && error.details.status !== undefined) {
    payload.status = error.details.status;
  }

  return payload;
}

/** Records runtime rollout failure via optional logger — default no-op, no console output. */
export function logMediatorRuntimeRolloutFailure(
  error: unknown,
  logger?: MediatorRuntimeRolloutFailureLogger
): void {
  if (!logger) return;
  logger(buildRolloutFailurePayload(error));
}
