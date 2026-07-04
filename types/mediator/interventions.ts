/**
 * Intervention content model, expected effects, and library patterns.
 *
 * Role: Intervention Engine vocabulary. Dictionary unions live in {@link engineTypes}.
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
import type {
  ExpectedEffectSuccessCriterionType,
  ExpectedEffectVerificationMethod,
  InterventionType,
  InterventionVisibility,
  LibraryPatternStructure,
  TherapeuticIntent,
  TherapeuticStrategy,
} from './engineTypes';
import type { SessionPersonalityCore } from './personality';
import type { TherapeuticGoal } from './therapeuticGoal';

export type {
  ExpectedEffectSuccessCriterionType,
  ExpectedEffectVerificationMethod,
  InterventionType,
  InterventionVisibility,
  LibraryPatternStructure,
} from './engineTypes';

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

/** Metadata about the last intervention — persisted for Reflection. */
export interface LastInterventionMeta {
  interventionId: MediatorEntityId;
  type: InterventionType;
  intent: TherapeuticIntent;
  expectedEffect: ExpectedEffect;
  strategy: TherapeuticStrategy;
  deliveredAt: IsoTimestamp;
  turnNumber: TurnNumber;
}
