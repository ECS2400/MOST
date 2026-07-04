/**
 * Explainability Layer types for Mediator AI Engine v2.3.
 *
 * Role: deterministic audit trail per turn for debugging and tests.
 */

import type { IsoTimestamp, MediatorEntityId, TurnNumber } from './common';
import type { ConversationPace } from './dynamics';
import type { ComplianceResult } from './constitution';
import type {
  ExplainabilityGoalTransition,
  InterventionType,
  TherapeuticIntent,
  TherapeuticStrategy,
} from './engineTypes';
import type { PriorityOutputSummary } from './priority';
import type {
  ReadinessAssessmentSummary,
  ReflectionOutputSummary,
} from './reflection';
import type { StrategyEngineOutputSummary } from './strategyEngineIo';
import type { TherapeuticGoal } from './therapeuticGoal';

export type { ExplainabilityGoalTransition } from './engineTypes';

/** Decision outcome snapshot embedded in {@link DecisionExplanation}. */
export interface DecisionOutcome {
  strategy: TherapeuticStrategy;
  interventionType: InterventionType;
  intent: TherapeuticIntent;
  goalTransition: ExplainabilityGoalTransition;
  pace: ConversationPace;
}

/** Single reasoning step in a decision explanation chain. */
export interface ExplanationStep {
  order: number;
  module: string;
  statement: string;
  evidenceRefs?: MediatorEntityId[];
  confidence?: number;
}

/** Rejected alternative considered by Decision Engine. */
export interface RejectedAlternative {
  option: string;
  reason: string;
}

/** Module input summaries embedded in explainability records. */
export interface DecisionModuleInputs {
  reflection: ReflectionOutputSummary;
  priority: PriorityOutputSummary;
  strategy: StrategyEngineOutputSummary;
  readiness: ReadinessAssessmentSummary;
}

/**
 * Full per-turn decision explanation persisted after orchestration.
 *
 * Role: primary debug artifact for Mediator AI Engine v2.3.
 */
export interface DecisionExplanation {
  turnNumber: TurnNumber;
  timestamp: IsoTimestamp;
  decisionId: MediatorEntityId;
  outcome: DecisionOutcome;
  reasoning: ExplanationStep[];
  constitutionArticleRefs: string[];
  evidenceRefs: MediatorEntityId[];
  moduleInputs: DecisionModuleInputs;
  rejectedAlternatives: RejectedAlternative[];
  complianceResult?: ComplianceResult;
}

/** Contribution from a single pipeline module to the explanation. */
export interface ExplanationContribution {
  module: string;
  steps: ExplanationStep[];
}

/**
 * Explainability bundle exported with each orchestrate_turn response.
 *
 * Role: cross-cutting public name for the Explainability Layer output.
 */
export interface Explainability {
  decisionExplanation: DecisionExplanation;
  contributions: ExplanationContribution[];
  currentGoal: TherapeuticGoal;
}

/** Log of explainability records for post-session export. */
export interface ExplainabilityLog {
  sessionId: string;
  entries: DecisionExplanation[];
}
