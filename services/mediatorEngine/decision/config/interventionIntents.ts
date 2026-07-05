import type { InterventionType, TherapeuticIntent } from '@/types/mediator';

/** Default therapeutic intent for each intervention type. */
export const INTERVENTION_DEFAULT_INTENT: Partial<Record<InterventionType, TherapeuticIntent>> = {
  welcome_open: 'increase_emotional_safety',
  choice_emotion: 'help_name_emotion',
  choice_need: 'help_name_need',
  open_deepen: 'help_explain_emotion',
  validate: 'help_partner_feel_heard',
  reflect: 'help_partner_feel_heard',
  mirror: 'help_see_other_perspective',
  reframe: 'help_see_other_perspective',
  propose_rule: 'prepare_shared_agreement',
  propose_future_plan: 'define_future_coping_plan',
  celebrate_breakthrough: 'consolidate_breakthrough',
  deescalate: 'reduce_defensiveness',
  redirect_blame: 'reduce_blame_cycle',
  gentle_redirect_evasion: 'reduce_defensiveness',
  pause_session: 'invite_pause_and_breathe',
  remind_goal: 'restore_trust_in_process',
  invite_reflection: 'help_explain_emotion',
  summarize_close: 'close_with_dignity',
  confirm_agreement: 'prepare_shared_agreement',
  safety_response: 'increase_emotional_safety',
  recover_acknowledge: 'correct_misunderstanding',
};
