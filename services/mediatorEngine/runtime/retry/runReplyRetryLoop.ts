import type {
  GenerateMediatorReplyOutput,
  MediatorLang,
  PromptComposerOutput,
  ReplyRetryLoopResult,
  ResponseValidationResult,
  SafeRuntimeContext,
  SafetyLevel,
  TurnNumber,
} from '@/types/mediator';
import { generateMediatorReply } from '@/services/mediatorEngine/llm/generateMediatorReply';
import { validateMediatorReply } from '@/services/mediatorEngine/responseValidator/validateMediatorReply';

export interface ReplyRetryLoopInput {
  promptComposerOutput: PromptComposerOutput;
  ctx: SafeRuntimeContext;
  safetyLevel: SafetyLevel;
  turnNumber: TurnNumber;
}

/**
 * Runs generate → validate loop with retry support.
 * Re-invokes the provider on retry without rebuilding the prompt (future-ready).
 */
export async function runReplyRetryLoop(input: ReplyRetryLoopInput): Promise<ReplyRetryLoopResult> {
  const { promptComposerOutput, ctx, safetyLevel, turnNumber } = input;
  let retryCount = 0;
  let attemptNumber = 1;
  let llmOutput: GenerateMediatorReplyOutput | null = null;
  let responseValidation: ResponseValidationResult | null = null;

  while (attemptNumber <= ctx.maxReplyAttempts) {
    llmOutput = await generateMediatorReply({
      promptComposerOutput,
      provider: ctx.llmProvider,
      language: ctx.language,
      safetyLevel,
      turnNumber,
    });

    responseValidation = validateMediatorReply({
      draftReply: llmOutput.draftReply,
      promptComposerOutput,
      safetyLevel,
      language: ctx.language,
      turnNumber,
      attemptNumber,
      maxAttempts: ctx.maxReplyAttempts,
    });

    if (responseValidation.action === 'accept') {
      return {
        llmOutput,
        responseValidation,
        retryCount,
        fallbackUsed: llmOutput.fallbackUsed || false,
      };
    }

    if (responseValidation.action === 'fallback') {
      return {
        llmOutput,
        responseValidation,
        retryCount,
        fallbackUsed: true,
      };
    }

    retryCount += 1;
    attemptNumber += 1;
  }

  const lastLlm =
    llmOutput ??
    (await generateMediatorReply({
      promptComposerOutput,
      provider: ctx.llmProvider,
      language: ctx.language,
      safetyLevel,
      turnNumber,
    }));

  const lastValidation =
    responseValidation ??
    validateMediatorReply({
      draftReply: lastLlm.draftReply,
      promptComposerOutput,
      safetyLevel,
      language: ctx.language,
      turnNumber,
      attemptNumber: ctx.maxReplyAttempts,
      maxAttempts: ctx.maxReplyAttempts,
    });

  return {
    llmOutput: lastLlm,
    responseValidation: lastValidation,
    retryCount,
    fallbackUsed: lastValidation.action === 'fallback' || lastLlm.fallbackUsed,
  };
}

export type { ReplyRetryLoopInput };
