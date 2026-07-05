import type { LlmProviderRequest, PromptComposerOutput, SafetyLevel, TurnNumber } from '@/types/mediator';
import type { SafeLlmContext } from '@/services/mediatorEngine/llm/lib/safeLlmInput';

/** Builds an LLM provider request from normalized context. */
export function buildLlmRequest(ctx: SafeLlmContext): LlmProviderRequest {
  const output = ctx.promptComposerOutput;

  return {
    systemPrompt: output.systemPrompt,
    developerPrompt: output.developerPrompt,
    userPrompt: output.userPrompt,
    modelHints: output.modelHints,
    metadata: {
      turnNumber: ctx.turnNumber,
      language: ctx.language,
      safetyLevel: ctx.safetyLevel,
      interventionType: output.promptMetadata.interventionType,
      goal: output.promptMetadata.goal,
    },
  };
}

/** Builds request directly from PromptComposerOutput and scalar fields. */
export function buildLlmRequestFromOutput(
  output: PromptComposerOutput,
  language: SafeLlmContext['language'],
  safetyLevel: SafetyLevel,
  turnNumber: TurnNumber
): LlmProviderRequest {
  return {
    systemPrompt: output.systemPrompt,
    developerPrompt: output.developerPrompt,
    userPrompt: output.userPrompt,
    modelHints: output.modelHints,
    metadata: {
      turnNumber,
      language,
      safetyLevel,
      interventionType: output.promptMetadata?.interventionType ?? 'validate',
      goal: output.promptMetadata?.goal ?? 'SAFE_OPENING',
    },
  };
}
