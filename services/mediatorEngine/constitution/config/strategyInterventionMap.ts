import type { InterventionType, TherapeuticStrategy } from '@/types/mediator';

/** Deterministic strategy → allowed intervention types (L1 compatibility table). */
export const STRATEGY_INTERVENTION_COMPATIBILITY: Record<
  TherapeuticStrategy,
  readonly InterventionType[]
> = {
  build_safety: [
    'welcome_open',
    'validate',
    'deescalate',
    'pause_session',
    'safety_response',
    'reflect',
  ],
  reduce_tension: [
    'deescalate',
    'validate',
    'reflect',
    'pause_session',
    'redirect_blame',
    'reframe',
  ],
  validate_emotions: ['validate', 'reflect', 'mirror', 'choice_emotion'],
  deepen_emotions: ['open_deepen', 'reflect', 'mirror', 'choice_emotion', 'invite_reflection'],
  transition_to_needs: ['choice_need', 'open_deepen', 'reflect', 'reframe', 'remind_goal'],
  increase_mutual_understanding: [
    'reflect',
    'mirror',
    'reframe',
    'open_deepen',
    'invite_reflection',
  ],
  stop_escalation: [
    'deescalate',
    'redirect_blame',
    'pause_session',
    'propose_rule',
  ],
  prepare_agreement: [
    'propose_rule',
    'confirm_agreement',
    'propose_future_plan',
    'summarize_close',
    'remind_goal',
  ],
  close_topic: ['summarize_close', 'confirm_agreement', 'celebrate_breakthrough', 'remind_goal'],
  recover_misinterpretation: ['recover_acknowledge', 'reflect', 'validate', 'reframe'],
  hold_space: ['validate', 'reflect', 'pause_session'],
  consolidate_progress: [
    'celebrate_breakthrough',
    'validate',
    'summarize_close',
    'reflect',
    'confirm_agreement',
  ],
};
