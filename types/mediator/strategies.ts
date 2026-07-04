/**
 * Therapeutic strategies, intents, personality, pace, load, and recovery.
 *
 * Role: Therapeutic Strategy Engine (TSE) vocabulary — defines *direction*
 * before Decision Engine selects *action* and Intervention Engine selects *words*.
 */

import type {
  ConfidenceScore,
  InterventionTarget,
  IsoTimestamp,
  TurnNumber,
} from './common';
import type { DynamicsSignalBundle, EmotionalLoadState, ConversationPace, PaceState } from './dynamics';
import type { ConfidenceValue } from './evidence';
import type { GoalTransition, OutcomeCheck, SessionObjectives } from './goals';
import type { MediationState } from './mediationState';
import type { PriorityOutput } from './priority';
import type { ReflectionOutput } from './reflection';
import type { SafetyOutput } from './safety';
import type { SessionMemory } from './sessionMemory';
import type { TherapeuticGoal } from './therapeuticGoal';

/**
 * High-level therapeutic direction selected by TSE for the current turn.
 *
 * Role: bridges Reflection output and Decision Engine — not an intervention type.
 */
export type TherapeuticStrategy =
  | 'build_safety'
  | 'reduce_tension'
  | 'validate_emotions'
  | 'deepen_emotions'
  | 'transition_to_needs'
  | 'increase_mutual_understanding'
  | 'stop_escalation'
  | 'prepare_agreement'
  | 'close_topic'
  | 'recover_misinterpretation'
  | 'hold_space'
  | 'consolidate_progress';

/**
 * Fine-grained psychological purpose of a single intervention.
 *
 * Role: constrains Intervention Engine generation — answers *why* not *what*.
 */
export type TherapeuticIntent =
  | 'increase_emotional_safety'
  | 'reduce_defensiveness'
  | 'help_name_emotion'
  | 'help_explain_emotion'
  | 'help_partner_feel_heard'
  | 'help_see_other_perspective'
  | 'help_name_need'
  | 'reduce_blame_cycle'
  | 'restore_trust_in_process'
  | 'consolidate_breakthrough'
  | 'prepare_shared_agreement'
  | 'define_future_coping_plan'
  | 'close_with_dignity'
  | 'correct_misunderstanding'
  | 'invite_pause_and_breathe'
  | 'acknowledge_exhaustion';

/** Named personality profile derived from SessionPersonality.core scores. */
export type SessionPersonalityProfile =
  | 'gentle_guide'
  | 'steady_mediator'
  | 'warm_facilitator'
  | 'calm_anchor';

/** Core stylistic trait scores (0–100), fixed after SAFE_OPENING. */
export interface SessionPersonalityCore {
  calm: number;
  warm: number;
  structured: number;
  neutral: number;
  empathetic: number;
  confident: number;
}

/** Bounded micro-adjustments applied during the session (max ±15 per trait). */
export interface SessionPersonalityAdaptiveModifiers {
  warmthBoost: number;
  structureBoost: number;
  lastAdjustedTurn: TurnNumber;
}

/**
 * Stable stylistic identity of the mediator for one session.
 *
 * Role: modulates Intervention Library tone without changing Constitution rules.
 * Established at SAFE_OPENING; core values are immutable thereafter.
 */
export interface SessionPersonality {
  core: SessionPersonalityCore;
  profile: SessionPersonalityProfile;
  adaptiveModifiers: SessionPersonalityAdaptiveModifiers;
  /** Reference IDs pointing to Constitution articles — not free text. */
  immutableRuleRefs: string[];
}

/** Trigger that activates Recovery Strategy. */
export type RecoveryTrigger =
  | 'explicit_correction'
  | 'implicit_correction'
  | 'frustration_with_mediator'
  | 'wrong_check_confirmed'
  | 'intent_mismatch';

/**
 * Active recovery process after mediator misinterpretation.
 *
 * Role: TSE switches to recover_misinterpretation; affected checks revert to pending.
 */
export interface RecoveryState {
  active: boolean;
  trigger: RecoveryTrigger;
  triggerQuote: string;
  confidence: ConfidenceScore;
  startedAtTurn: TurnNumber;
  /** Max 2 attempts per trigger before falling back to hold_space. */
  recoveryAttempt: number;
  affectedCheckIds: string[];
  affectedFields: string[];
}

/**
 * Recovery Strategy configuration — normal part of architecture, not edge case.
 *
 * Role: documents the intended recovery flow for implementers and tests.
 */
export interface RecoveryStrategy {
  trigger: RecoveryTrigger;
  primaryStrategy: 'recover_misinterpretation';
  primaryIntent: 'correct_misunderstanding' | 'restore_trust_in_process';
  maxAttempts: number;
  fallbackStrategy: 'hold_space';
  revertCheckStatuses: Array<'likely' | 'confirmed'>;
}

/** Active strategy persisted in MediationState between turns. */
export interface ActiveStrategyState {
  primary: TherapeuticStrategy;
  secondary: TherapeuticStrategy | null;
  sinceTurn: TurnNumber;
  confidence: ConfidenceScore;
}

/** TSE recommendation for goal movement (non-binding for Decision Engine). */
export type SuggestedGoalTransition =
  | 'stay'
  | 'prepare_advance'
  | 'regress'
  | null;

/** Input contract for Therapeutic Strategy Engine. */
export interface StrategyEngineInput {
  mediationState: MediationState;
  currentGoal: TherapeuticGoal;
  goalChecks: OutcomeCheck[];
  reflection: ReflectionOutput;
  priority: PriorityOutput;
  safety: SafetyOutput | null;
  pace: ConversationPace;
  load: EmotionalLoadState;
  recovery: RecoveryState | null;
  sessionPersonality: SessionPersonality;
  sessionMemory: SessionMemory;
  sessionObjectives: SessionObjectives | null;
  dynamics: DynamicsSignalBundle;
}

/** Output contract for Therapeutic Strategy Engine. */
export interface StrategyEngineOutput {
  primaryStrategy: TherapeuticStrategy;
  secondaryStrategy: TherapeuticStrategy | null;
  confidence: ConfidenceScore;
  rationale: string;
  blockedStrategies: TherapeuticStrategy[];
  suggestedGoalTransition: SuggestedGoalTransition;
  /** Recommended strategy duration in turns (1–3). */
  strategyDurationHint: number;
  alignmentWithGoal: TherapeuticGoal;
}

/** Compact summary for Explainability Layer module inputs. */
export interface StrategyEngineOutputSummary {
  primaryStrategy: TherapeuticStrategy;
  secondaryStrategy: TherapeuticStrategy | null;
  suggestedGoalTransition: SuggestedGoalTransition;
  confidence: ConfidenceScore;
}

/** Binding of intent to intervention context — input to Intervention Engine. */
export interface InterventionIntent {
  intent: TherapeuticIntent;
  goal: TherapeuticGoal;
  strategy: TherapeuticStrategy;
  targetParticipant: InterventionTarget;
  addressesCheckId: string | null;
  confidence: ConfidenceScore;
}

/** Metadata about the last intervention — persisted for Reflection. */
export interface LastInterventionMeta {
  interventionId: string;
  type: import('./interventions').InterventionType;
  intent: TherapeuticIntent;
  expectedEffect: import('./interventions').ExpectedEffect;
  strategy: TherapeuticStrategy;
  deliveredAt: IsoTimestamp;
  turnNumber: TurnNumber;
}
