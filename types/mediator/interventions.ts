/**
 * Intervention types, content model, expected effects, and library patterns.
 *
 * Role: Intervention Engine vocabulary. The mediator generates {@link Intervention}
 * objects — not bare questions. Each intervention carries intent, expected effect,
 * and optional library pattern reference.
 */

import type {
  ConfidenceScore,
  InterventionSignature,
  InterventionTarget,
  IsoTimestamp,
  MediatorEntityId,
  MediatorLang,
  TurnNumber,
} from './common';
import type { SessionPersonalityCore } from './strategies';
import type { TherapeuticGoal } from './therapeuticGoal';
import type { TherapeuticIntent, TherapeuticStrategy } from './strategies';

/**
 * Canonical intervention type taxonomy.
 *
 * Role: Decision Engine output — maps to Intervention Library patterns and
 * dedicated generators in the edge function pipeline.
 */
export type InterventionType =
  | 'welcome_open'
  | 'choice_emotion'
  | 'choice_need'
  | 'open_deepen'
  | 'validate'
  | 'reflect'
  | 'mirror'
  | 'reframe'
  | 'propose_rule'
  | 'propose_future_plan'
  | 'celebrate_breakthrough'
  | 'deescalate'
  | 'redirect_blame'
  | 'gentle_redirect_evasion'
  | 'pause_session'
  | 'remind_goal'
  | 'invite_reflection'
  | 'summarize_close'
  | 'confirm_agreement'
  | 'safety_response'
  | 'recover_acknowledge';

/** Visibility of intervention content in the chat UI. */
export type InterventionVisibility = 'public' | 'private';

/** Selectable option for choice-style interventions. */
export interface InterventionOption {
  id: string;
  label: string;
  value: string;
}

/** User-facing message payload of an intervention. */
export interface InterventionContent {
  primaryMessage: string;
  secondaryMessage?: string;
  options?: InterventionOption[];
}

/** Method used by Reflection to verify an expected effect. */
export type ExpectedEffectVerificationMethod =
  | 'next_message'
  | 'checklist_delta'
  | 'confidence_delta';

/** Criterion type for expected effect success evaluation. */
export type ExpectedEffectSuccessCriterionType =
  | 'message_contains'
  | 'check_confirmed'
  | 'score_increase'
  | 'tone_shift';

/** Quantified success criterion for {@link ExpectedEffect}. */
export interface ExpectedEffectSuccessCriteria {
  type: ExpectedEffectSuccessCriterionType;
  threshold: number;
  confidenceRequired: ConfidenceScore;
}

/**
 * Observable psychological effect expected after an intervention.
 *
 * Role: Reflection Engine evaluates the previous turn's effect against this
 * contract before Strategy Engine selects the next direction.
 */
export interface ExpectedEffect {
  id: MediatorEntityId;
  description: string;
  observableSignals: string[];
  targetParticipant: InterventionTarget;
  verificationMethod: ExpectedEffectVerificationMethod;
  successCriteria: ExpectedEffectSuccessCriteria;
  /** Number of turns allowed for verification (1 or 2). */
  timeHorizon: 1 | 2;
}

/** Result of Reflection evaluating a prior ExpectedEffect. */
export interface ExpectedEffectEvaluation {
  effectId: MediatorEntityId;
  achieved: boolean;
  confidence: ConfidenceScore;
  evidence: string[];
  partial: boolean;
}

/**
 * Complete intervention ready for delivery to the conversation.
 *
 * Role: output of Intervention Engine after library selection and LLM
 * personalisation, input to Constitution Compliance Validator.
 */
export interface Intervention {
  id: MediatorEntityId;
  type: InterventionType;
  target: InterventionTarget;
  visibility: InterventionVisibility;
  content: InterventionContent;
  goal: TherapeuticGoal;
  intent: TherapeuticIntent;
  strategy: TherapeuticStrategy;
  rationale: string;
  expectedEffect: ExpectedEffect;
  libraryPatternId: string | null;
  doNotRepeatBefore?: TurnNumber;
  signature: InterventionSignature;
  generatedAt: IsoTimestamp;
}

/**
 * Legacy-compatible alias used in early architecture docs.
 *
 * Role: same shape as {@link Intervention} with string expectedEffect for
 * backward compatibility during migration from v1 edge function types.
 */
export interface MediatorIntervention {
  id: MediatorEntityId;
  type: InterventionType;
  target: InterventionTarget;
  visibility: InterventionVisibility;
  content: InterventionContent;
  goal: TherapeuticGoal;
  rationale: string;
  /** Short human description — prefer structured {@link ExpectedEffect} in v2.3. */
  expectedEffectSummary: string;
  doNotRepeatBefore?: TurnNumber;
}

/** Structural skeleton of an Intervention Library pattern. */
export type LibraryPatternStructure = 'single' | 'two_part' | 'choice';

/** Template skeleton for Intervention Library YAML patterns. */
export interface LibraryPatternSkeleton {
  structure: LibraryPatternStructure;
  template: string;
  maxSentences: number;
  tone: Partial<SessionPersonalityCore>;
}

/** Constraints enforced on library patterns beyond Constitution. */
export interface LibraryPatternConstraints {
  forbiddenPhrases: string[];
  requiredElements: string[];
  constitutionArticleRefs: string[];
}

/** Optional choice configuration for library patterns. */
export interface LibraryPatternOptions {
  template: string[];
  minOptions: number;
  maxOptions: number;
}

/**
 * Declarative intervention pattern from the Intervention Library (YAML).
 *
 * Role: deterministic skeleton selected by pattern ID before LLM personalisation.
 */
export interface InterventionPattern {
  id: string;
  interventionType: InterventionType;
  intents: TherapeuticIntent[];
  strategies: TherapeuticStrategy[];
  skeleton: LibraryPatternSkeleton;
  constraints: LibraryPatternConstraints;
  options?: LibraryPatternOptions;
  locale: MediatorLang;
  version: string;
}

/** Alias — architecture document name for {@link InterventionPattern}. */
export type LibraryPattern = InterventionPattern;

/** Reference to a selected library pattern without full template payload. */
export interface InterventionPatternRef {
  patternId: string;
  locale: MediatorLang;
  version: string;
}
