/**
 * Dictionary types (string-literal unions) for Mediator AI Engine v2.3.
 *
 * Role: leaf-level vocabulary with zero imports from engine modules.
 * Every other file in types/mediator/ may import from here safely.
 */

/** High-level therapeutic direction selected by TSE for the current turn. */
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

/** Fine-grained psychological purpose of a single intervention. */
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

/** Canonical intervention type taxonomy. */
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

/** Category of safety signal detected in partner messages (L1). */
export type SafetySignalCategory =
  | 'self_harm'
  | 'suicide'
  | 'violence_threat'
  | 'child_safety'
  | 'coercion_control'
  | 'severe_distress'
  | 'abuse_disclosure'
  | 'immediate_danger';

/** Response level triggered by accumulated safety signals. */
export type SafetyLevel = 'none' | 'L1_gentle' | 'L2_pause' | 'L3_stop';

/** High-level conversation mode set by Priority Engine. */
export type ConversationMode =
  | 'NORMAL'
  | 'DE_ESCALATING'
  | 'REDIRECTING'
  | 'BREAKTHROUGH'
  | 'SAFETY';

/** Therapeutic tempo of the session — slow / normal / fast. */
export type ConversationPace = 'slow' | 'normal' | 'fast';

/** Dynamic event types ranked by Priority Engine. */
export type PrioritySignalType =
  | 'safety'
  | 'escalation'
  | 'recovery'
  | 'blame_loop'
  | 'breakthrough'
  | 'exhaustion'
  | 'readiness'
  | 'default_strategy'
  | 'evasion'
  | 'stuck';

/** Classification of a breakthrough detected during mediation. */
export type BreakthroughType =
  | 'apology'
  | 'vulnerability'
  | 'mutual_understanding'
  | 'perspective_shift'
  | 'need_acknowledgment'
  | 'reconciliation'
  | 'ownership'
  | 'other';

/** Trigger that activates Recovery Strategy. */
export type RecoveryTrigger =
  | 'explicit_correction'
  | 'implicit_correction'
  | 'frustration_with_mediator'
  | 'wrong_check_confirmed'
  | 'intent_mismatch';

/** Standardised emotion labels used in choice interventions and state tracking. */
export type EmotionLabel =
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'frustration'
  | 'hurt'
  | 'disappointment'
  | 'loneliness'
  | 'shame'
  | 'guilt'
  | 'anxiety'
  | 'resentment'
  | 'overwhelm'
  | 'other';

/** Standardised need labels used in need-naming interventions. */
export type NeedLabel =
  | 'respect'
  | 'safety'
  | 'understanding'
  | 'connection'
  | 'fairness'
  | 'autonomy'
  | 'support'
  | 'recognition'
  | 'peace'
  | 'trust'
  | 'closeness'
  | 'other';

/** Surface-level conflict topic taxonomy. */
export type SurfaceTopic =
  | 'money'
  | 'chores'
  | 'children'
  | 'jealousy'
  | 'intimacy'
  | 'family'
  | 'communication'
  | 'time'
  | 'other';

/** Deep emotional theme underlying the surface conflict. */
export type DeepTheme =
  | 'safety'
  | 'respect'
  | 'loneliness'
  | 'rejection'
  | 'influence'
  | 'fairness'
  | 'not_heard'
  | 'fear'
  | 'trust_loss'
  | 'other';

/** How confidently a participant named their emotion (0 = unsure, 3 = explicit). */
export type EmotionNamingConfidence = 0 | 1 | 2 | 3;

/** Detected tone of the participant's most recent message. */
export type MessageTone =
  | 'calm'
  | 'elevated'
  | 'accusatory'
  | 'vulnerable'
  | 'reconciliatory';

/** Types of mediator actions recorded in conversation memory. */
export type MediatorActionType =
  | 'intervention'
  | 'summary'
  | 'question'
  | 'validation'
  | 'pause_proposal'
  | 'safety_response'
  | 'goal_transition';

/** Trend direction for emotional temperature or load over recent turns. */
export type TrendDirection = 'rising' | 'stable' | 'falling';

/** Named personality profile derived from SessionPersonality.core scores. */
export type SessionPersonalityProfile =
  | 'gentle_guide'
  | 'steady_mediator'
  | 'warm_facilitator'
  | 'calm_anchor';

/** TSE recommendation for goal movement (non-binding for Decision Engine). */
export type SuggestedGoalTransition =
  | 'stay'
  | 'prepare_advance'
  | 'regress'
  | null;

/** Recommended shift in therapeutic approach after Reflection self-evaluation. */
export type StrategyShift =
  | 'continue'
  | 'slow_down'
  | 'deescalate'
  | 'recover'
  | 'consolidate'
  | 'switch_to_choice'
  | 'switch_to_reflect'
  | 'advance_goal'
  | 'regress_goal'
  | 'pause';

/** Goal transition decision recorded in explainability output. */
export type ExplainabilityGoalTransition =
  | 'stay'
  | 'advance'
  | 'regress'
  | 'skip'
  | null;

/** Visibility of intervention content in the chat UI. */
export type InterventionVisibility = 'public' | 'private';

/** Structural skeleton of an Intervention Library pattern. */
export type LibraryPatternStructure = 'single' | 'two_part' | 'choice';

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
