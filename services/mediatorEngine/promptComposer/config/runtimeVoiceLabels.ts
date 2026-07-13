import type { InterventionType, TherapeuticIntent, TherapeuticStrategy } from '@/types/mediator';

/** Display-only voice labels for strategies — internal IDs unchanged. */
export const STRATEGY_VOICE_LABEL: Record<TherapeuticStrategy, string> = {
  build_safety: 'slow_conflict',
  reduce_tension: 'break_deadlock',
  validate_emotions: 'reveal_pattern',
  deepen_emotions: 'dig_deeper',
  transition_to_needs: 'identify_trigger',
  increase_mutual_understanding: 'compare_perspectives',
  stop_escalation: 'slow_conflict',
  prepare_agreement: 'move_forward',
  close_topic: 'move_forward',
  recover_misinterpretation: 'break_deadlock',
  hold_space: 'break_deadlock',
  consolidate_progress: 'move_forward',
};

/** Display-only voice labels for intents — internal IDs unchanged. */
export const INTENT_VOICE_LABEL: Record<TherapeuticIntent, string> = {
  increase_emotional_safety: 'slow_conflict',
  reduce_defensiveness: 'break_deadlock',
  help_name_emotion: 'identify_trigger',
  help_explain_emotion: 'dig_deeper',
  help_partner_feel_heard: 'compare_perspectives',
  help_see_other_perspective: 'compare_perspectives',
  help_name_need: 'identify_trigger',
  reduce_blame_cycle: 'break_deadlock',
  restore_trust_in_process: 'move_forward',
  consolidate_breakthrough: 'move_forward',
  prepare_shared_agreement: 'move_forward',
  define_future_coping_plan: 'move_forward',
  close_with_dignity: 'move_forward',
  correct_misunderstanding: 'break_deadlock',
  invite_pause_and_breathe: 'slow_conflict',
  acknowledge_exhaustion: 'break_deadlock',
};

/** Display-only voice labels for intervention types — internal IDs unchanged. */
export const INTERVENTION_VOICE_LABEL: Record<InterventionType, string> = {
  welcome_open: 'move_forward',
  choice_emotion: 'identify_trigger',
  choice_need: 'identify_trigger',
  open_deepen: 'dig_deeper',
  validate: 'reveal_pattern',
  reflect: 'compare_perspectives',
  mirror: 'compare_perspectives',
  reframe: 'break_deadlock',
  propose_rule: 'move_forward',
  propose_future_plan: 'move_forward',
  celebrate_breakthrough: 'move_forward',
  deescalate: 'slow_conflict',
  redirect_blame: 'break_deadlock',
  gentle_redirect_evasion: 'focus_conversation',
  pause_session: 'slow_conflict',
  remind_goal: 'focus_conversation',
  invite_reflection: 'dig_deeper',
  summarize_close: 'move_forward',
  confirm_agreement: 'move_forward',
  safety_response: 'slow_conflict',
  recover_acknowledge: 'break_deadlock',
};

export function voiceLabelForStrategy(strategy: string | null | undefined): string {
  if (typeof strategy === 'string' && strategy in STRATEGY_VOICE_LABEL) {
    return STRATEGY_VOICE_LABEL[strategy as TherapeuticStrategy];
  }
  return STRATEGY_VOICE_LABEL.build_safety;
}

export function voiceLabelForIntent(intent: string | null | undefined): string {
  if (typeof intent === 'string' && intent in INTENT_VOICE_LABEL) {
    return INTENT_VOICE_LABEL[intent as TherapeuticIntent];
  }
  return INTENT_VOICE_LABEL.increase_emotional_safety;
}

export function voiceLabelForIntervention(type: string | null | undefined): string {
  if (typeof type === 'string' && type in INTERVENTION_VOICE_LABEL) {
    return INTERVENTION_VOICE_LABEL[type as InterventionType];
  }
  return INTERVENTION_VOICE_LABEL.validate;
}
