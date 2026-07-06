/**
 * Prompt Composer types for Mediator AI Engine v2.3.
 *
 * Role: builds safe LLM prompts from deterministic pipeline outputs.
 */

import type { MediatorLang, TurnNumber } from './common';
import type { ComplianceResult } from './constitution';
import type { DecisionEngineOutput } from './pipeline';
import type { Intervention } from './interventions';
import type { MediationState } from './mediationState';
import type { PriorityOutput } from './priority';
import type { ReflectionOutput, TranscriptMessage } from './reflection';
import type { SafetyLevel, SafetyOutput } from './safety';
import type { GoalContinuityContext } from './goalContinuity';
import type { ContinuityContext } from './continuity';
import type { SessionMemory } from './sessionMemory';
import type { StrategyEngineOutput } from './strategyEngineIo';

/** Sanitized transcript message for prompt inclusion. */
export interface TranscriptWindowEntry {
  authorRole: 'host' | 'partner' | 'mediator';
  content: string;
}

/** Input to Prompt Composer for a single turn. */
export interface PromptComposerInput {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  safetyOutput: SafetyOutput | null;
  reflectionOutput: ReflectionOutput;
  strategyOutput: StrategyEngineOutput;
  priorityOutput: PriorityOutput;
  decisionOutput: DecisionEngineOutput;
  intervention: Intervention;
  complianceResult: ComplianceResult;
  transcriptWindow: TranscriptMessage[];
  language: MediatorLang;
  turnNumber: TurnNumber;
  /** Structural continuity hints for prompt — no transcript or PII. */
  continuityContext?: ContinuityContext;
  /** Structural goal-stage hints for prompt — no transcript or PII. */
  goalContinuityContext?: GoalContinuityContext;
}

/** Safety constraints embedded in the composed prompt. */
export interface SafetyEnvelope {
  active: boolean;
  level: SafetyLevel;
  instructions: string[];
  allowNormalMediation: boolean;
}

/** Metadata about the composed prompt — no private user data. */
export interface PromptMetadata {
  turnNumber: TurnNumber;
  language: MediatorLang;
  interventionType: string;
  goal: string;
  composedAt: string;
  transcriptMessageCount: number;
}

/** LLM generation hints for downstream bridge. */
export interface ModelHints {
  temperature: number;
  maxOutputTokens: number;
  style: 'calm' | 'structured' | 'concise';
  responseFormat: 'plain_text';
}

/** Output of Prompt Composer — ready for LLM bridge. */
export interface PromptComposerOutput {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  contextSummary: string;
  promptMetadata: PromptMetadata;
  safetyEnvelope: SafetyEnvelope;
  tokenEstimate: number;
  modelHints: ModelHints;
}
