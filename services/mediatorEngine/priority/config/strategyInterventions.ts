import type { InterventionType, TherapeuticStrategy } from '@/types/mediator';

/** Strategy → allowed intervention types for Priority Engine fallback (mirrors constitution L1 map). */
export const PRIORITY_STRATEGY_INTERVENTIONS: Record<
  TherapeuticStrategy,
  readonly InterventionType[]
> = {
  build_safety: ['welcome_open', 'validate', 'deescalate', 'pause_session', 'safety_response', 'reflect'],
  reduce_tension: ['deescalate', 'validate', 'reflect', 'pause_session', 'redirect_blame', 'reframe'],
  validate_emotions: ['validate', 'reflect', 'mirror', 'choice_emotion'],
  deepen_emotions: ['open_deepen', 'reflect', 'mirror', 'choice_emotion', 'invite_reflection'],
  transition_to_needs: ['choice_need', 'open_deepen', 'reflect', 'reframe', 'remind_goal'],
  increase_mutual_understanding: ['reflect', 'mirror', 'reframe', 'open_deepen', 'invite_reflection'],
  stop_escalation: ['deescalate', 'redirect_blame', 'pause_session', 'propose_rule'],
  prepare_agreement: ['propose_rule', 'confirm_agreement', 'propose_future_plan', 'summarize_close', 'remind_goal'],
  close_topic: ['summarize_close', 'confirm_agreement', 'celebrate_breakthrough', 'remind_goal'],
  recover_misinterpretation: ['recover_acknowledge', 'reflect', 'validate', 'reframe'],
  hold_space: ['validate', 'reflect', 'pause_session'],
  consolidate_progress: ['celebrate_breakthrough', 'validate', 'summarize_close', 'reflect', 'confirm_agreement'],
};

export const ALL_INTERVENTION_TYPES: readonly InterventionType[] = [
  'welcome_open',
  'choice_emotion',
  'choice_need',
  'open_deepen',
  'validate',
  'reflect',
  'mirror',
  'reframe',
  'propose_rule',
  'propose_future_plan',
  'celebrate_breakthrough',
  'deescalate',
  'redirect_blame',
  'gentle_redirect_evasion',
  'pause_session',
  'remind_goal',
  'invite_reflection',
  'summarize_close',
  'confirm_agreement',
  'safety_response',
  'recover_acknowledge',
];

export const SAFETY_INTERVENTIONS: readonly InterventionType[] = [
  'safety_response',
  'pause_session',
  'deescalate',
];

export const ESCALATION_INTERVENTIONS: readonly InterventionType[] = [
  'deescalate',
  'pause_session',
  'validate',
  'reflect',
  'redirect_blame',
  'propose_rule',
];

export const ESCALATION_FORBIDDEN: readonly InterventionType[] = [
  'celebrate_breakthrough',
  'open_deepen',
  'choice_emotion',
  'choice_need',
];

export const BLAME_LOOP_INTERVENTIONS: readonly InterventionType[] = [
  'redirect_blame',
  'deescalate',
  'reflect',
  'reframe',
  'propose_rule',
];

export const BREAKTHROUGH_INTERVENTIONS: readonly InterventionType[] = [
  'celebrate_breakthrough',
  'validate',
  'reflect',
  'summarize_close',
  'confirm_agreement',
];

export const EXHAUSTION_INTERVENTIONS: readonly InterventionType[] = [
  'pause_session',
  'validate',
  'reflect',
  'invite_reflection',
];

export const REPAIR_VOICE_INTERVENTIONS: readonly InterventionType[] = [
  'recover_acknowledge',
  'reflect',
  'reframe',
  'validate',
];

/** Primary recommended intervention for a therapeutic strategy fallback. */
export function primaryInterventionForStrategy(strategy: TherapeuticStrategy): InterventionType {
  return PRIORITY_STRATEGY_INTERVENTIONS[strategy][0] ?? 'reflect';
}

/** Allowed interventions for a therapeutic strategy. */
export function allowedInterventionsForStrategy(strategy: TherapeuticStrategy): InterventionType[] {
  return [...(PRIORITY_STRATEGY_INTERVENTIONS[strategy] ?? ['reflect'])];
}
