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
import { tryTargetedRewrite } from '@/services/mediatorEngine/runtime/retry/targetedRewrite';

function uniqueFailedRuleIds(validation: ResponseValidationResult): string[] {
  const ids = (validation.ruleResults ?? [])
    .filter((r) => r && r.passed === false)
    .map((r) => r.ruleId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)];
}

function logAttemptDev(params: {
  attempt: number;
  validationAction: string;
  failedRuleIds: string[];
  currentGoal: string | null;
  stage: string | null;
  interventionType: string | null;
  outputLength: number;
  questionCount: number;
  providerSucceeded: boolean;
}): void {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) return;
  console.info('[mediatorValidationAttempt]', params);
}

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
  let retryInstruction: string | null = null;

  while (attemptNumber <= ctx.maxReplyAttempts) {
    llmOutput = await generateMediatorReply({
      promptComposerOutput,
      provider: ctx.llmProvider,
      language: ctx.language,
      safetyLevel,
      turnNumber,
      attemptNumber,
      retryInstruction,
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

    const failedRuleIds = uniqueFailedRuleIds(responseValidation);
    const providerSucceeded = Boolean(llmOutput.providerResponse);
    logAttemptDev({
      attempt: attemptNumber,
      validationAction: responseValidation.action,
      failedRuleIds,
      currentGoal: String(promptComposerOutput.promptMetadata?.goal ?? '') || null,
      stage: String(promptComposerOutput.promptMetadata?.goal ?? '') || null,
      interventionType: String(promptComposerOutput.promptMetadata?.interventionType ?? '') || null,
      outputLength: llmOutput.draftReply.text.length,
      questionCount: llmOutput.draftReply.validation?.questionCount ?? 0,
      providerSucceeded,
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

    // If stylistically fine but structurally off (length/questions/sentences),
    // do a deterministic targeted rewrite before burning another provider call.
    const rewrite = tryTargetedRewrite({
      draftReply: llmOutput.draftReply,
      failedRuleIds,
      language: ctx.language,
      safetyLevel,
      turnNumber,
    });
    if (rewrite) {
      const rewrittenValidation = validateMediatorReply({
        draftReply: rewrite,
        promptComposerOutput,
        safetyLevel,
        language: ctx.language,
        turnNumber,
        attemptNumber,
        maxAttempts: ctx.maxReplyAttempts,
      });
      if (rewrittenValidation.action === 'accept') {
        return {
          llmOutput: { ...llmOutput, draftReply: rewrite },
          responseValidation: rewrittenValidation,
          retryCount,
          fallbackUsed: llmOutput.fallbackUsed || false,
        };
      }
      responseValidation = rewrittenValidation;
    }

    retryInstruction = responseValidation.retryInstruction;
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
      attemptNumber: ctx.maxReplyAttempts,
      retryInstruction,
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
