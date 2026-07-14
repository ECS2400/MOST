import type { LlmProviderPort } from '@/types/mediator';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { createEdgeLlmProvider } from '@/services/mediatorEngine/edge/createEdgeLlmProvider';
import {
  createMediatorRuntimeError,
  MEDIATOR_RUNTIME_ERROR_CODES,
  type MediatorRuntimeErrorBody,
} from '@/services/mediatorEngine/edge/errors';
import { parseMediatorRuntimeRequest, toOrchestrateTurnRequest } from '@/services/mediatorEngine/edge/request';
import { logLlmValidationFailed } from '@/services/mediatorEngine/edge/llmValidationDevLog';
import { MEDIATOR_RUNTIME_BUILD_ID } from '@/services/mediatorEngine/edge/mediatorRuntimeBuild';
import { buildMediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/response';
import type {
  MediatorRuntimeEdgeEnv,
  MediatorRuntimeEdgeResult,
} from '@/services/mediatorEngine/edge/types';

function logDevResponseSource(runtimeOutput: Awaited<ReturnType<typeof runMediatorEngineTurn>>): void {
  // Edge is server-side; this is a DEV-only console log consumed by local/dev debugging.
  // Do not include prompts, transcripts, or message bodies.
  const providerModel =
    runtimeOutput.llmOutput.providerResponse?.model && typeof runtimeOutput.llmOutput.providerResponse.model === 'string'
      ? runtimeOutput.llmOutput.providerResponse.model
      : null;

  const providerSucceeded = Boolean(runtimeOutput.llmOutput.providerResponse);

  const reasonCodes = (runtimeOutput.responseValidation.ruleResults ?? [])
    .filter((r) => r && r.passed === false)
    .map((r) => r.ruleId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const uniqueReasonCodes = [...new Set(reasonCodes)];

  const finalSource = runtimeOutput.finalMediatorMessage.source;
  const source =
    finalSource === 'llm'
      ? runtimeOutput.retryCount > 0
        ? 'retry_llm'
        : 'llm'
      : finalSource;

  console.info('[mediatorResponseSource]', {
    runtimeBuild: MEDIATOR_RUNTIME_BUILD_ID,
    source,
    fallbackUsed: runtimeOutput.fallbackUsed,
    validationAction: runtimeOutput.responseValidation.action,
    validationReasonCodes: uniqueReasonCodes,
    retryCount: runtimeOutput.retryCount,
    providerSucceeded,
    model: providerModel,
  });
}

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

    // DEV-only log for tracing source/fallbacks (safe: no prompt/transcript/text).
    logDevResponseSource(runtimeOutput);

    // Production reliability rule:
    // For normal mediation (non L2/L3) in the real production provider path,
    // never return user-visible fallback/stub text. Instead return a recoverable
    // structured error so the client can retry without advancing/persisting state.
    // Tests pass llmProviderOverride and are allowed to observe stub/fallback output.
    const safetyLevel = runtimeOutput.finalMediatorMessage.safetyLevel;
    const isSafetyException = safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';
    const finalSource = runtimeOutput.finalMediatorMessage.source;
    const providerSucceeded = Boolean(runtimeOutput.llmOutput.providerResponse);
    const reasonCodes = (runtimeOutput.responseValidation.ruleResults ?? [])
      .filter((r) => r && r.passed === false)
      .map((r) => r.ruleId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const uniqueReasonCodes = [...new Set(reasonCodes)];

    const enforceNoNormalFallbackInEdge = !options.llmProviderOverride;
    if (
      enforceNoNormalFallbackInEdge &&
      !isSafetyException &&
      (finalSource === 'fallback' || finalSource === 'stub')
    ) {
      const code = providerSucceeded
        ? MEDIATOR_RUNTIME_ERROR_CODES.LLM_VALIDATION_FAILED
        : MEDIATOR_RUNTIME_ERROR_CODES.LLM_TEMPORARILY_UNAVAILABLE;
      const message =
        code === MEDIATOR_RUNTIME_ERROR_CODES.LLM_TEMPORARILY_UNAVAILABLE
          ? 'LLM temporarily unavailable'
          : 'LLM reply failed validation';

      logLlmValidationFailed({
        mediationId: parsed.value.mediationId,
        engineVersion: parsed.value.engineVersion,
        model:
          runtimeOutput.llmOutput.providerResponse?.model ??
          runtimeOutput.finalMediatorMessage.source,
        originalProviderText:
          runtimeOutput.llmOutput.originalProviderText ??
          runtimeOutput.llmOutput.providerResponse?.text ??
          null,
        effectiveValidatedText: runtimeOutput.llmOutput.draftReply.text,
        draftValidationReasons:
          runtimeOutput.llmOutput.draftValidationReasons ??
          runtimeOutput.llmOutput.draftReply.validation?.reasons ??
          [],
        fallbackSubstituted: runtimeOutput.llmOutput.fallbackSubstituted ?? false,
        validation: runtimeOutput.responseValidation,
        trigger: parsed.value.trigger,
        turnNumber: parsed.value.turnNumber,
        attemptNumber: runtimeOutput.retryCount + 1,
        providerSucceeded,
        finalSource: runtimeOutput.finalMediatorMessage.source,
        retryInstruction: runtimeOutput.responseValidation.retryInstruction,
      });

      return {
        ok: false,
        error: createMediatorRuntimeError(code, message, {
          retryable: true,
          retryAfterMs: 2000,
          retryCount: runtimeOutput.retryCount,
          validationReasonCodes: uniqueReasonCodes,
          providerSucceeded,
        }).error,
        status: 503,
      };
    }

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
