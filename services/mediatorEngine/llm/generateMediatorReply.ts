import type {
  DraftMediatorReply,
  GenerateMediatorReplyInput,
  GenerateMediatorReplyOutput,
  LlmProviderResponse,
} from '@/types/mediator';
import { buildLlmRequest } from '@/services/mediatorEngine/llm/lib/buildLlmRequest';
import { safeLlmInput } from '@/services/mediatorEngine/llm/lib/safeLlmInput';
import { logLlmRawResponse } from '@/services/mediatorEngine/edge/llmValidationDevLog';
import { parseLlmTextResponse } from '@/services/mediatorEngine/llm/parse/parseLlmTextResponse';
import { validateDraftReply } from '@/services/mediatorEngine/llm/validate/validateDraftReply';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';

function resolveSource(providerId: string): DraftMediatorReply['source'] {
  if (providerId === 'deterministic-stub') return 'stub';
  if (providerId === 'fallback') return 'fallback';
  return 'llm';
}

function buildProviderDraftOutput(
  text: string,
  rawProviderText: string,
  providerId: string,
  model: string,
  ctx: ReturnType<typeof safeLlmInput>,
  providerResponse: LlmProviderResponse,
  generatedAt: string
): GenerateMediatorReplyOutput {
  const validation = validateDraftReply(text, ctx.language, ctx.safetyLevel);

  return {
    draftReply: {
      text,
      language: ctx.language,
      safetyLevel: ctx.safetyLevel,
      source: resolveSource(providerId),
      validation,
      metadata: {
        turnNumber: ctx.turnNumber,
        providerId,
        model,
        generatedAt,
      },
    },
    providerResponse,
    fallbackUsed: false,
    fallbackSubstituted: false,
    originalProviderText: rawProviderText,
    draftValidationReasons: validation.reasons,
    generatedAt,
  };
}

function buildFallbackOutput(
  ctx: ReturnType<typeof safeLlmInput>,
  reasons: string[],
  providerResponse?: LlmProviderResponse,
  generatedAt?: string,
  originalProviderText?: string | null
): GenerateMediatorReplyOutput {
  const at = generatedAt ?? new Date().toISOString();
  const draftReply = createFallbackMediatorReply(ctx.language, ctx.safetyLevel, ctx.turnNumber, reasons);
  return {
    draftReply,
    providerResponse,
    fallbackUsed: true,
    fallbackSubstituted: Boolean(originalProviderText && originalProviderText.trim().length > 0),
    originalProviderText: originalProviderText ?? null,
    draftValidationReasons: reasons,
    generatedAt: at,
  };
}

/**
 * Generates a validated draft mediator reply from PromptComposerOutput.
 *
 * Provider drafts that fail L1 validation are passed through unchanged so the
 * post-LLM validator can retry with the real failure reason — they are not
 * replaced by deterministic fallback text before retry.
 *
 * Never throws.
 */
export async function generateMediatorReply(
  input: GenerateMediatorReplyInput
): Promise<GenerateMediatorReplyOutput> {
  const generatedAt = new Date().toISOString();

  try {
    const ctx = safeLlmInput(input);
    const request = buildLlmRequest(ctx);

    let providerResponse: LlmProviderResponse | undefined;

    try {
      providerResponse = await ctx.provider.generateText(request);
    } catch {
      return buildFallbackOutput(ctx, ['Provider error'], undefined, generatedAt);
    }

    const rawProviderText = providerResponse.text ?? '';
    const text = parseLlmTextResponse(rawProviderText);

    logLlmRawResponse({
      engineVersion: 'v2.3',
      model: providerResponse.model,
      rawText: rawProviderText,
      sanitizedText: text,
      turnNumber: ctx.turnNumber,
      attemptNumber: ctx.attemptNumber,
      trigger: ctx.promptComposerOutput.promptMetadata?.goal,
    });

    if (!text.trim()) {
      return buildFallbackOutput(ctx, ['Empty provider response'], providerResponse, generatedAt, rawProviderText);
    }

    const output = buildProviderDraftOutput(
      text,
      rawProviderText,
      ctx.provider.providerId,
      providerResponse.model,
      ctx,
      providerResponse,
      generatedAt
    );

    if (!output.draftReply.validation.valid) {
      logLlmRawResponse({
        engineVersion: 'v2.3',
        model: providerResponse.model,
        rawText: rawProviderText,
        sanitizedText: text,
        turnNumber: ctx.turnNumber,
        attemptNumber: ctx.attemptNumber,
        trigger: ctx.promptComposerOutput.promptMetadata?.goal,
        draftValidationReasons: output.draftValidationReasons,
        draftValidationRejected: true,
      });
    }

    return output;
  } catch {
    const draftReply = createFallbackMediatorReply('en', 'none', 1, ['Unexpected error']);
    return {
      draftReply,
      fallbackUsed: true,
      fallbackSubstituted: false,
      originalProviderText: null,
      draftValidationReasons: ['Unexpected error'],
      generatedAt: new Date().toISOString(),
    };
  }
}
