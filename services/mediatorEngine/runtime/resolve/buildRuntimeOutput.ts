import type {
  FinalMediatorMessage,
  MediatorRuntimeOutput,
  OrchestrateTurnResponse,
  PromptComposerOutput,
  ReplyRetryLoopResult,
  RuntimeMetadata,
  SafeRuntimeContext,
} from '@/types/mediator';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';

export interface BuildRuntimeOutputParams {
  ctx: SafeRuntimeContext;
  orchestratedTurn: OrchestrateTurnResponse;
  promptComposerOutput: PromptComposerOutput;
  retryResult: ReplyRetryLoopResult;
  finalMediatorMessage: FinalMediatorMessage;
  startedAt: string;
  completedAt: string;
}

/** Assembles the full MediatorRuntimeOutput. */
export function buildRuntimeOutput(params: BuildRuntimeOutputParams): MediatorRuntimeOutput {
  const { ctx, orchestratedTurn, promptComposerOutput, retryResult, finalMediatorMessage, startedAt, completedAt } =
    params;

  const durationMs = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  const providerId = ctx.llmProvider.providerId;

  const runtimeMetadata: RuntimeMetadata = {
    engineVersion: orchestratedTurn.engineVersion ?? RUNTIME_LIMITS.engineVersion,
    turnNumber: ctx.turnInput.turnNumber,
    startedAt,
    completedAt,
    durationMs,
    providerId,
    retryCount: retryResult.retryCount,
  };

  return {
    orchestratedTurn,
    promptComposerOutput,
    llmOutput: retryResult.llmOutput,
    responseValidation: retryResult.responseValidation,
    finalMediatorMessage,
    fallbackUsed: retryResult.fallbackUsed || retryResult.llmOutput.fallbackUsed,
    retryCount: retryResult.retryCount,
    runtimeMetadata,
  };
}

/** Returns true when runtime metadata does not embed transcript content. */
export function isRuntimeMetadataTranscriptSafe(metadata: RuntimeMetadata): boolean {
  const serialized = JSON.stringify(metadata);
  return !serialized.includes('Host:') && !serialized.includes('Partner:') && !serialized.includes('Dialogue');
}

export type { BuildRuntimeOutputParams };
