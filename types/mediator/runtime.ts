/**
 * Mediator Engine runtime types for Phase 2D.
 *
 * Role: full turn flow from orchestrator through final mediator message.
 */

import type { MediatorLang, TurnNumber } from './common';
import type { GenerateMediatorReplyOutput } from './llm';
import type { PromptComposerOutput } from './promptComposer';
import type { OrchestrateTurnRequest, OrchestrateTurnResponse } from './pipeline';
import type { ResponseValidationAction, ResponseValidationResult } from './responseValidator';
import type { LlmProviderPort } from './llm';
import type { SafetyLevel } from './safety';
import type { SessionMemory } from './sessionMemory';
import type { RuntimeSession } from './runtimeSession';

/** Input to the engine runtime turn runner. */
export interface MediatorRuntimeInput {
  turnInput: OrchestrateTurnRequest;
  sessionMemory: SessionMemory;
  llmProvider?: LlmProviderPort;
  maxReplyAttempts?: number;
  language?: MediatorLang;
}

/** User-facing final mediator message for downstream UI. */
export interface FinalMediatorMessage {
  text: string;
  source: 'llm' | 'fallback' | 'stub';
  safetyLevel: SafetyLevel;
  language: MediatorLang;
  turnNumber: TurnNumber;
  accepted: boolean;
  validationAction: ResponseValidationAction;
}

/** Runtime metadata — no full transcript content. */
export interface RuntimeMetadata {
  engineVersion: string;
  turnNumber: TurnNumber;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  providerId: string;
  retryCount: number;
}

/** Full output of one engine runtime turn. */
export interface MediatorRuntimeOutput {
  orchestratedTurn: OrchestrateTurnResponse;
  promptComposerOutput: PromptComposerOutput;
  llmOutput: GenerateMediatorReplyOutput;
  responseValidation: ResponseValidationResult;
  finalMediatorMessage: FinalMediatorMessage;
  fallbackUsed: boolean;
  retryCount: number;
  runtimeMetadata: RuntimeMetadata;
  runtimeSession: RuntimeSession;
}

/** Normalized runtime context used internally. */
export interface SafeRuntimeContext {
  turnInput: OrchestrateTurnRequest;
  sessionMemory: SessionMemory;
  llmProvider: LlmProviderPort;
  maxReplyAttempts: number;
  language: MediatorLang;
}

/** Result of the reply retry loop. */
export interface ReplyRetryLoopResult {
  llmOutput: GenerateMediatorReplyOutput;
  responseValidation: ResponseValidationResult;
  retryCount: number;
  fallbackUsed: boolean;
}
