import type {
  DraftMediatorReply,
  GenerateMediatorReplyInput,
  GenerateMediatorReplyOutput,
  LlmProviderResponse,
} from '@/types/mediator';
import { buildLlmRequest } from '@/services/mediatorEngine/llm/lib/buildLlmRequest';
import { safeLlmInput } from '@/services/mediatorEngine/llm/lib/safeLlmInput';
import { parseLlmTextResponse } from '@/services/mediatorEngine/llm/parse/parseLlmTextResponse';
import { validateDraftReply } from '@/services/mediatorEngine/llm/validate/validateDraftReply';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';

function resolveSource(providerId: string): DraftMediatorReply['source'] {
  if (providerId === 'deterministic-stub') return 'stub';
  if (providerId === 'fallback') return 'fallback';
  return 'llm';
}

function buildSuccessOutput(
  text: string,
  providerId: string,
  model: string,
  ctx: ReturnType<typeof safeLlmInput>,
  providerResponse: LlmProviderResponse | undefined,
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
    generatedAt,
  };
}

function buildFallbackOutput(
  ctx: ReturnType<typeof safeLlmInput>,
  reasons: string[],
  providerResponse?: LlmProviderResponse,
  generatedAt?: string
): GenerateMediatorReplyOutput {
  const at = generatedAt ?? new Date().toISOString();
  return {
    draftReply: createFallbackMediatorReply(ctx.language, ctx.safetyLevel, ctx.turnNumber, reasons),
    providerResponse,
    fallbackUsed: true,
    generatedAt: at,
  };
}

/**
 * Generates a validated draft mediator reply from PromptComposerOutput.
 *
 * Does not call live LLM APIs. Never throws.
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

    const text = parseLlmTextResponse(providerResponse.text ?? '');

    if (!text.trim()) {
      return buildFallbackOutput(ctx, ['Empty provider response'], providerResponse, generatedAt);
    }

    const validation = validateDraftReply(text, ctx.language, ctx.safetyLevel);
    if (!validation.valid) {
      return buildFallbackOutput(ctx, validation.reasons, providerResponse, generatedAt);
    }

    return buildSuccessOutput(
      text,
      ctx.provider.providerId,
      providerResponse.model,
      ctx,
      providerResponse,
      generatedAt
    );
  } catch {
    const draftReply = createFallbackMediatorReply('en', 'none', 1, ['Unexpected error']);
    return {
      draftReply,
      fallbackUsed: true,
      generatedAt: new Date().toISOString(),
    };
  }
}
