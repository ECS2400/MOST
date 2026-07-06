import type { LlmProviderPort } from '@/types/mediator';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createEdgeLlmProvider } from '@/services/mediatorEngine/edge/createEdgeLlmProvider';
import {
  createMediatorRuntimeError,
  MEDIATOR_RUNTIME_ERROR_CODES,
  type MediatorRuntimeErrorBody,
} from '@/services/mediatorEngine/edge/errors';
import { parseMediatorRuntimeRequest, toOrchestrateTurnRequest } from '@/services/mediatorEngine/edge/request';
import { buildMediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/response';
import type {
  MediatorRuntimeEdgeEnv,
  MediatorRuntimeEdgeResult,
} from '@/services/mediatorEngine/edge/types';

export interface HandleMediatorRuntimeTurnOptions {
  env?: MediatorRuntimeEdgeEnv;
  llmProviderOverride?: LlmProviderPort;
  fetchImpl?: typeof fetch;
}

/**
 * Executes one mediator-runtime turn.
 *
 * Missing OPENAI_API_KEY → ok:false / code missing_openai_api_key (503).
 * We return a controlled error instead of silent stub fallback so production
 * misconfiguration is visible; tests inject llmProviderOverride.
 */
export async function handleMediatorRuntimeTurn(
  body: unknown,
  options: HandleMediatorRuntimeTurnOptions = {}
): Promise<
  MediatorRuntimeEdgeResult | { ok: false; error: MediatorRuntimeErrorBody['error']; status: number }
> {
  const parsed = parseMediatorRuntimeRequest(body);
  if (!parsed.ok) {
    return parsed;
  }

  const providerResult = createEdgeLlmProvider({
    env: options.env ?? {},
    llmProviderOverride: options.llmProviderOverride,
    fetchImpl: options.fetchImpl,
  });

  if (!providerResult.ok) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_OPENAI_API_KEY,
        'OPENAI_API_KEY is not configured for mediator-runtime'
      ).error,
      status: 503,
    };
  }

  try {
    const runtimeOutput = await runMediatorEngineTurn({
      turnInput: toOrchestrateTurnRequest(parsed.value),
      sessionMemory: parsed.value.sessionMemory,
      language: parsed.value.language,
      llmProvider: providerResult.provider,
    });

    return buildMediatorRuntimeEdgeSuccess(runtimeOutput);
  } catch {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.INTERNAL_ERROR,
        'Mediator runtime failed unexpectedly'
      ).error,
      status: 500,
    };
  }
}
