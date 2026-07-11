import type {
  MediatorLang,
  OrchestrateTurnRequest,
  OrchestrateTurnTrigger,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  createMediatorRuntimeError,
  MEDIATOR_RUNTIME_ERROR_CODES,
} from '@/services/mediatorEngine/edge/errors';
import type { MediatorRuntimeErrorBody } from '@/services/mediatorEngine/edge/errors';
import { parseClientEventsFromRequest } from '@/services/mediatorEngine/edge/normalizeClientEvents';
import type { MediatorRuntimeEdgeRequest } from '@/services/mediatorEngine/edge/types';

const SUPPORTED_LANGUAGES: MediatorLang[] = ['pl', 'en', 'es', 'it', 'de', 'fr'];

const SUPPORTED_TRIGGERS: OrchestrateTurnTrigger[] = [
  'session_start',
  'partner_message',
  'host_generate',
  'resume_after_pause',
];

export type ParseMediatorRuntimeRequestResult =
  | { ok: true; value: MediatorRuntimeEdgeRequest }
  | { ok: false; error: MediatorRuntimeErrorBody['error']; status: number };

function normalizeLanguage(value: unknown): MediatorLang {
  if (typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as MediatorLang)) {
    return value as MediatorLang;
  }
  return 'en';
}

function normalizeTrigger(value: unknown): OrchestrateTurnTrigger {
  if (value === 'host_message') return 'host_generate';
  if (
    typeof value === 'string' &&
    SUPPORTED_TRIGGERS.includes(value as OrchestrateTurnTrigger)
  ) {
    return value as OrchestrateTurnTrigger;
  }
  return 'partner_message';
}

/**
 * Normalizes turnNumber to a positive integer.
 * Invalid values fall back to 1 (permissive for partial client payloads).
 */
function normalizeTurnNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  }
  return 1;
}

function normalizeTranscriptDelta(value: unknown): TranscriptMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is TranscriptMessage =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as TranscriptMessage).content === 'string'
  );
}

function normalizeSessionMemory(value: unknown): SessionMemory {
  if (value && typeof value === 'object') {
    return value as SessionMemory;
  }
  return createEmptySessionMemory();
}

/** Validates and normalizes mediator-runtime request JSON. Never embeds transcript in errors. */
export function parseMediatorRuntimeRequest(body: unknown): ParseMediatorRuntimeRequestResult {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        'Request body must be a JSON object'
      ).error,
      status: 400,
    };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.mediationId !== 'string' || raw.mediationId.trim().length === 0) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_MEDIATION_ID,
        'mediationId is required'
      ).error,
      status: 400,
    };
  }

  if (typeof raw.sessionId !== 'string' || raw.sessionId.trim().length === 0) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_SESSION_ID,
        'sessionId is required'
      ).error,
      status: 400,
    };
  }

  if (raw.engineVersion !== 'v2.3') {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.UNSUPPORTED_ENGINE_VERSION,
        'Only engineVersion v2.3 is supported by mediator-runtime'
      ).error,
      status: 400,
    };
  }

  const clientEvents = parseClientEventsFromRequest(raw.clientEvents);
  if (clientEvents === 'invalid') {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.INVALID_CLIENT_EVENTS,
        'clientEvents must be an array when provided'
      ).error,
      status: 400,
    };
  }

  const request: MediatorRuntimeEdgeRequest = {
    mediationId: raw.mediationId.trim(),
    sessionId: raw.sessionId.trim(),
    turnNumber: normalizeTurnNumber(raw.turnNumber),
    trigger: normalizeTrigger(raw.trigger),
    mediationState:
      raw.mediationState && typeof raw.mediationState === 'object'
        ? (raw.mediationState as MediatorRuntimeEdgeRequest['mediationState'])
        : null,
    sessionMemory: normalizeSessionMemory(raw.sessionMemory),
    transcriptDelta: normalizeTranscriptDelta(raw.transcriptDelta),
    language: normalizeLanguage(raw.language),
    engineVersion: 'v2.3',
    clientEvents,
  };

  return { ok: true, value: request };
}

/** Builds OrchestrateTurnRequest for runMediatorEngineTurn. */
export function toOrchestrateTurnRequest(
  request: MediatorRuntimeEdgeRequest
): OrchestrateTurnRequest {
  return {
    mediationId: request.mediationId,
    sessionId: request.sessionId,
    trigger: request.trigger,
    turnNumber: request.turnNumber,
    mediationState: request.mediationState,
    transcriptDelta: request.transcriptDelta,
    engineVersion: 'v2.3',
    language: request.language,
    clientEvents: request.clientEvents,
  };
}

export { normalizeLanguage, normalizeTurnNumber, normalizeTranscriptDelta };
