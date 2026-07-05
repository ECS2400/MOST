/**
 * LLM Bridge types for Mediator AI Engine v2.3.
 *
 * Role: converts PromptComposerOutput into a validated DraftMediatorReply.
 * Phase 2B: port + fake/stub providers only — no live API calls.
 */

import type { MediatorLang, TurnNumber } from './common';
import type { ModelHints, PromptComposerOutput } from './promptComposer';
import type { SafetyLevel } from './safety';

/** Port for LLM text generation — implemented by fake/stub adapters in L1. */
export interface LlmProviderPort {
  readonly providerId: string;
  generateText(request: LlmProviderRequest): Promise<LlmProviderResponse>;
}

/** Request payload sent to an LLM provider. */
export interface LlmProviderRequest {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  modelHints: ModelHints;
  metadata: LlmRequestMetadata;
}

/** Minimal metadata attached to LLM requests — no full transcript. */
export interface LlmRequestMetadata {
  turnNumber: TurnNumber;
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  interventionType: string;
  goal: string;
}

/** Raw response from an LLM provider. */
export interface LlmProviderResponse {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'error' | 'unknown';
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Validation result for a draft mediator reply. */
export interface DraftReplyValidation {
  valid: boolean;
  reasons: string[];
  blockedTermsFound: string[];
  questionCount: number;
  sentenceCount: number;
  lengthChars: number;
  safetyCompliant: boolean;
}

/** Validated draft reply ready for downstream compliance review. */
export interface DraftMediatorReply {
  text: string;
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  source: 'llm' | 'fallback' | 'stub';
  validation: DraftReplyValidation;
  metadata: DraftReplyMetadata;
}

/** Metadata about the generated draft — no private user data. */
export interface DraftReplyMetadata {
  turnNumber: TurnNumber;
  providerId: string;
  model: string;
  generatedAt: string;
}

/** Input to the LLM bridge for a single turn. */
export interface GenerateMediatorReplyInput {
  promptComposerOutput: PromptComposerOutput;
  provider: LlmProviderPort;
  language: MediatorLang;
  safetyLevel: SafetyLevel;
  turnNumber: TurnNumber;
}

/** Output of the LLM bridge. */
export interface GenerateMediatorReplyOutput {
  draftReply: DraftMediatorReply;
  providerResponse?: LlmProviderResponse;
  fallbackUsed: boolean;
  generatedAt: string;
}
