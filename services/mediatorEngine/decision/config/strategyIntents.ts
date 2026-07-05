import type { TherapeuticIntent, TherapeuticStrategy } from '@/types/mediator';

/** Default therapeutic intent for each primary strategy. */
export const STRATEGY_DEFAULT_INTENT: Record<TherapeuticStrategy, TherapeuticIntent> = {
  build_safety: 'increase_emotional_safety',
  reduce_tension: 'reduce_defensiveness',
  validate_emotions: 'help_partner_feel_heard',
  deepen_emotions: 'help_explain_emotion',
  transition_to_needs: 'help_name_need',
  increase_mutual_understanding: 'help_see_other_perspective',
  stop_escalation: 'reduce_blame_cycle',
  prepare_agreement: 'prepare_shared_agreement',
  close_topic: 'close_with_dignity',
  recover_misinterpretation: 'correct_misunderstanding',
  hold_space: 'acknowledge_exhaustion',
  consolidate_progress: 'consolidate_breakthrough',
};
