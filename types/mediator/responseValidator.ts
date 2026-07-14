/**
 * Post-LLM response validation types for Mediator AI Engine v2.3.
 *
 * Role: validates DraftMediatorReply and decides accept / retry / fallback.
 * Phase 2C: no LLM calls, no prompt generation.
 */

import type { MediatorLang, TurnNumber } from './common';
import type { DraftMediatorReply } from './llm';
import type { PromptComposerOutput } from './promptComposer';
import type { SafetyLevel } from './safety';

/** Outcome action after post-LLM validation. */
export type ResponseValidationAction = 'accept' | 'retry' | 'fallback';

/** Result of a single validation rule. */
export interface ResponseValidationRuleResult {
  ruleId: string;
  passed: boolean;
  severity: 'block' | 'warn';
  reason: string;
  metadata?: Record<string, string | number | boolean>;
  /** Populated by repeated_intervention for precise retry guidance. */
  repetitionMatchDetail?: RepetitionMatchRetryDetail;
}

/** Serializable repetition match passed into retry instruction builder. */
export interface RepetitionMatchRetryDetail {
  priorIndex: number;
  priorText: string;
  matchedPhrase: string | null;
  matchTypes: string[];
  tokenOverlap: number;
  phraseHitCount: number;
  questionOverlap: number | null;
  matchedReasons: string[];
}

/** Full post-LLM validation result. */
export interface ResponseValidationResult {
  valid: boolean;
  action: ResponseValidationAction;
  ruleResults: ResponseValidationRuleResult[];
  blockingReasons: string[];
  warningReasons: string[];
  retryInstruction: string | null;
  fallbackReply: DraftMediatorReply | null;
  validatedReply: DraftMediatorReply | null;
  validatedAt: string;
}

/** Input to post-LLM response validator. */
export interface ResponseValidationInput {
  draftReply: DraftMediatorReply;
  promptComposerOutput: PromptComposerOutput;
  safetyLevel: SafetyLevel;
  language: MediatorLang;
  turnNumber: TurnNumber;
  attemptNumber: number;
  maxAttempts: number;
}

/** Context passed to individual validation rules. */
export interface ResponseValidationContext {
  text: string;
  draftReply: DraftMediatorReply;
  safetyLevel: SafetyLevel;
  language: MediatorLang;
  turnNumber: TurnNumber;
  attemptNumber: number;
  maxAttempts: number;
  /** Therapeutic goal from prompt metadata — used for stage-specific validation. */
  currentGoal?: string;
  /** Recent mediator messages for cross-turn repetition detection. */
  recentMediatorMessages?: string[];
  /** Optional transcript ids aligned with recentMediatorMessages for diagnostics. */
  recentMediatorMessageRefs?: Array<{ id: string; content: string }>;
}
