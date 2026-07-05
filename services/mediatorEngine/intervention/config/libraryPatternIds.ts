import type { InterventionType } from '@/types/mediator';

/** Deterministic library pattern id per intervention type. */
export const LIBRARY_PATTERN_IDS: Record<InterventionType, string> = {
  welcome_open: 'welcome_open_v1',
  choice_emotion: 'choice_emotion_v1',
  choice_need: 'choice_need_v1',
  open_deepen: 'open_deepen_v1',
  validate: 'validate_v1',
  reflect: 'reflect_v1',
  mirror: 'mirror_v1',
  reframe: 'reframe_v1',
  propose_rule: 'propose_rule_v1',
  propose_future_plan: 'propose_future_plan_v1',
  celebrate_breakthrough: 'celebrate_breakthrough_v1',
  deescalate: 'deescalate_v1',
  redirect_blame: 'redirect_blame_v1',
  gentle_redirect_evasion: 'gentle_redirect_evasion_v1',
  pause_session: 'pause_session_v1',
  remind_goal: 'remind_goal_v1',
  invite_reflection: 'invite_reflection_v1',
  summarize_close: 'summarize_close_v1',
  confirm_agreement: 'confirm_agreement_v1',
  safety_response: 'safety_response_v1',
  recover_acknowledge: 'recover_acknowledge_v1',
};
