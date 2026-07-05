import type { MediatorRuntimeInput, MediatorRuntimeOutput } from '@/types/mediator';
import { orchestrateTurn } from '@/services/mediatorEngine/orchestrator/orchestrateTurn';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';
import { buildPromptComposerInputFromTurn } from '@/services/mediatorEngine/runtime/lib/buildPromptComposerInputFromTurn';
import { safeRuntimeInput } from '@/services/mediatorEngine/runtime/lib/safeRuntimeInput';
import { runReplyRetryLoop } from '@/services/mediatorEngine/runtime/retry/runReplyRetryLoop';
import {
  buildFinalMediatorMessage,
  resolveFinalDraftReply,
} from '@/services/mediatorEngine/runtime/final/buildFinalMediatorMessage';
import { buildRuntimeOutput } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';

/**
 * Executes the full Mediator Engine runtime flow for one turn.
 *
 * orchestrateTurn → composePrompt → generateMediatorReply → validateMediatorReply → finalMediatorMessage
 *
 * Never throws. Does not call live LLM APIs by default.
 */
export async function runMediatorEngineTurn(
  input: MediatorRuntimeInput | unknown
): Promise<MediatorRuntimeOutput> {
  const startedAt = new Date().toISOString();

  try {
    const ctx = safeRuntimeInput(input);

    const orchestratedTurn = orchestrateTurn({
      request: ctx.turnInput,
      sessionMemory: ctx.sessionMemory,
    });

    const promptInput = buildPromptComposerInputFromTurn(
      ctx.turnInput,
      ctx.sessionMemory,
      orchestratedTurn,
      ctx.language
    );

    const safetyLevel = promptInput.safetyOutput?.level ?? 'none';
    const promptComposerOutput = composePrompt(promptInput);

    const retryResult = await runReplyRetryLoop({
      promptComposerOutput,
      ctx,
      safetyLevel,
      turnNumber: ctx.turnInput.turnNumber,
    });

    const finalDraft = resolveFinalDraftReply(retryResult.responseValidation);
    const finalMediatorMessage = buildFinalMediatorMessage(
      finalDraft,
      retryResult.responseValidation.action,
      ctx.language,
      safetyLevel,
      ctx.turnInput.turnNumber
    );

    const completedAt = new Date().toISOString();

    return buildRuntimeOutput({
      ctx,
      orchestratedTurn,
      promptComposerOutput,
      retryResult,
      finalMediatorMessage,
      startedAt,
      completedAt,
    });
  } catch {
    return buildEmergencyRuntimeOutput(input, startedAt);
  }
}

function buildEmergencyRuntimeOutput(
  input: MediatorRuntimeInput | unknown,
  startedAt: string
): MediatorRuntimeOutput {
  const completedAt = new Date().toISOString();
  const ctx = safeRuntimeInput(input);
  const fallbackReply = createFallbackMediatorReply(ctx.language, 'none', ctx.turnInput.turnNumber);

  let orchestratedTurn;
  try {
    orchestratedTurn = orchestrateTurn({
      request: ctx.turnInput,
      sessionMemory: ctx.sessionMemory,
    });
  } catch {
    orchestratedTurn = {
      mediationState: {} as never,
      intervention: {} as never,
      sessionMemory: ctx.sessionMemory,
      evidenceStore: {} as never,
      explainability: {} as never,
      complianceResult: {
        compliant: true,
        violations: [],
        attemptNumber: 1,
        fallbackUsed: false,
        validatedAt: completedAt,
        validatorLayer: 'deterministic',
      },
      engineVersion: RUNTIME_LIMITS.engineVersion as 'v2.3',
    };
  }

  const promptComposerOutput = composePrompt(null as never);

  return buildRuntimeOutput({
    ctx,
    orchestratedTurn,
    promptComposerOutput,
    retryResult: {
      llmOutput: {
        draftReply: fallbackReply,
        fallbackUsed: true,
        generatedAt: completedAt,
      },
      responseValidation: {
        valid: false,
        action: 'fallback',
        ruleResults: [],
        blockingReasons: ['Unexpected runtime error'],
        warningReasons: [],
        retryInstruction: null,
        fallbackReply,
        validatedReply: fallbackReply,
        validatedAt: completedAt,
      },
      retryCount: 0,
      fallbackUsed: true,
    },
    finalMediatorMessage: buildFinalMediatorMessage(
      fallbackReply,
      'fallback',
      ctx.language,
      'none',
      ctx.turnInput.turnNumber
    ),
    startedAt,
    completedAt,
  });
}
