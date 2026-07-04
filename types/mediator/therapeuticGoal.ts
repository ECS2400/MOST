/**
 * Therapeutic goal taxonomy for Mediator AI Engine v2.3.
 *
 * Role: replaces legacy ConversationPhase (summary/gap/responsibility/repair).
 * Each goal represents a distinct therapeutic stage in the mediation pipeline.
 */

/**
 * Ordered therapeutic stages of a live mediation session.
 *
 * Role: active node in the mediation state machine. Transitions are gated by
 * {@link OutcomeCheck} confirmation, Priority Engine, and Human Safety Layer.
 */
export type TherapeuticGoal =
  | 'SAFE_OPENING'
  | 'EMOTION_NAMING'
  | 'EMOTION_UNDERSTANDING'
  | 'EMOTION_ACKNOWLEDGMENT'
  | 'NEED_NAMING'
  | 'PERSPECTIVE_SHARING'
  | 'REFRAME'
  | 'AGREEMENT'
  | 'FUTURE_PLAN'
  | 'CLOSURE';
