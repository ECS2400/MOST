import { sanitizeLlmResponse } from '@/services/mediatorEngine/llm/parse/sanitizeLlmResponse';

/** Parses and sanitizes raw LLM text into plain mediator speech. */
export function parseLlmTextResponse(raw: string): string {
  return sanitizeLlmResponse(raw);
}
