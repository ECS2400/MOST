import type { TherapeuticIntent, TherapeuticStrategy } from '@/types/mediator';

/** Default therapeutic intent for each primary strategy (L1). */
export const STRATEGY_INTENT_MAP: Record<TherapeuticStrategy, TherapeuticIntent> = {
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

/** Context-specific intent overrides keyed by selection priority. */
export const PRIORITY_INTENT_OVERRIDES: Partial<Record<string, TherapeuticIntent>> = {
  safety: 'increase_emotional_safety',
  recovery: 'correct_misunderstanding',
  escalation: 'reduce_defensiveness',
  blame: 'reduce_blame_cycle',
  exhaustion: 'acknowledge_exhaustion',
  breakthrough: 'consolidate_breakthrough',
};

/** Resolves intent for a strategy with optional priority override. */
export function intentForStrategy(
  strategy: TherapeuticStrategy,
  priorityKey?: string
): TherapeuticIntent {
  if (priorityKey && PRIORITY_INTENT_OVERRIDES[priorityKey]) {
    return PRIORITY_INTENT_OVERRIDES[priorityKey]!;
  }
  return STRATEGY_INTENT_MAP[strategy] ?? 'increase_emotional_safety';
}
