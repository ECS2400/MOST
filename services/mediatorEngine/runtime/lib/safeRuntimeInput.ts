import type {
  MediatorLang,
  MediatorRuntimeInput,
  OrchestrateTurnRequest,
  SafeRuntimeContext,
  SessionMemory,
} from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { normalizeClientEvents } from '@/services/mediatorEngine/edge/normalizeClientEvents';
import { createDefaultRuntimeProvider } from '@/services/mediatorEngine/runtime/adapters/defaultRuntimeProvider';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';

const SUPPORTED_LANGUAGES: MediatorLang[] = ['pl', 'en', 'it', 'de', 'fr', 'es'];

function normalizeLanguage(value: unknown, fallback: MediatorLang = 'en'): MediatorLang {
  if (typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as MediatorLang)) {
    return value as MediatorLang;
  }
  return fallback;
}

function createFallbackTurnInput(): OrchestrateTurnRequest {
  return {
    mediationId: 'runtime-fallback-mediation',
    sessionId: 'runtime-fallback-session',
    trigger: 'session_start',
    turnNumber: 1,
    mediationState: null,
    transcriptDelta: [],
    engineVersion: 'v2.3',
    clientEvents: [],
  };
}

/** Normalizes runtime input — never throws. */
export function safeRuntimeInput(input: unknown): SafeRuntimeContext {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<MediatorRuntimeInput>;

  const turnInputRaw =
    raw.turnInput && typeof raw.turnInput === 'object'
      ? raw.turnInput
      : createFallbackTurnInput();

  const clientEvents = normalizeClientEvents(turnInputRaw.clientEvents);

  const turnInput: OrchestrateTurnRequest = {
    ...turnInputRaw,
    clientEvents: clientEvents === 'invalid' ? [] : clientEvents,
  };

  const stateLanguage =
    turnInput.mediationState && typeof turnInput.mediationState === 'object'
      ? turnInput.mediationState.meta?.language
      : undefined;

  const language = normalizeLanguage(raw.language ?? stateLanguage);

  return {
    turnInput,
    sessionMemory:
      raw.sessionMemory && typeof raw.sessionMemory === 'object'
        ? raw.sessionMemory
        : createEmptySessionMemory(),
    llmProvider:
      raw.llmProvider && typeof raw.llmProvider === 'object' && typeof raw.llmProvider.generateText === 'function'
        ? raw.llmProvider
        : createDefaultRuntimeProvider(),
    maxReplyAttempts:
      typeof raw.maxReplyAttempts === 'number' && raw.maxReplyAttempts > 0
        ? raw.maxReplyAttempts
        : RUNTIME_LIMITS.defaultMaxReplyAttempts,
    language,
  };
}

export { normalizeLanguage };
