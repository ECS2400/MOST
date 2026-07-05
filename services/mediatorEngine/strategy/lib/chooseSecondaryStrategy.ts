import type { TherapeuticStrategy } from '@/types/mediator';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import type { SafeStrategyContext } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

const COMPATIBLE_SECONDARIES: Partial<Record<TherapeuticStrategy, TherapeuticStrategy[]>> = {
  build_safety: ['validate_emotions', 'hold_space'],
  reduce_tension: ['validate_emotions', 'build_safety'],
  stop_escalation: ['validate_emotions', 'build_safety'],
  validate_emotions: ['build_safety', 'hold_space'],
  deepen_emotions: ['validate_emotions'],
  consolidate_progress: ['validate_emotions'],
  hold_space: ['build_safety'],
  transition_to_needs: ['validate_emotions'],
  increase_mutual_understanding: ['validate_emotions'],
  prepare_agreement: ['validate_emotions'],
  close_topic: ['validate_emotions'],
  recover_misinterpretation: ['hold_space'],
};

function isCompatible(primary: TherapeuticStrategy, secondary: TherapeuticStrategy): boolean {
  if (primary === secondary) return false;
  const allowed = COMPATIBLE_SECONDARIES[primary];
  return allowed ? allowed.includes(secondary) : false;
}

/** Selects optional secondary strategy based on primary and context. */
export function chooseSecondaryStrategy(
  ctx: SafeStrategyContext,
  primaryStrategy: TherapeuticStrategy,
  priority: StrategyPriorityKey
): TherapeuticStrategy | null {
  if (priority === 'ESCALATION') {
    if (ctx.blameLoopActive) return 'build_safety';
    return 'validate_emotions';
  }

  if (priority === 'BREAKTHROUGH') {
    return 'validate_emotions';
  }

  if (priority === 'SAFETY' || priority === 'RECOVERY' || priority === 'EXHAUSTION') {
    return null;
  }

  const previous = ctx.previousPrimaryStrategy;
  if (previous && isCompatible(primaryStrategy, previous)) {
    return previous;
  }

  const defaults = COMPATIBLE_SECONDARIES[primaryStrategy];
  return defaults?.[0] ?? null;
}
