import type { TherapeuticIntent, TherapeuticStrategy } from '@/types/mediator';
import { intentForStrategy } from '@/services/mediatorEngine/strategy/config/strategyIntents';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import type { SafeStrategyContext } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

/** Maps priority tier to intent override key. */
function intentOverrideKey(
  ctx: SafeStrategyContext,
  priority: StrategyPriorityKey
): string | undefined {
  switch (priority) {
    case 'SAFETY':
      return 'safety';
    case 'RECOVERY':
      return 'recovery';
    case 'ESCALATION':
      return ctx.blameLoopActive ? 'blame' : 'escalation';
    case 'EXHAUSTION':
      return 'exhaustion';
    case 'BREAKTHROUGH':
      return 'breakthrough';
    default:
      return undefined;
  }
}

/** Selects therapeutic intent aligned with primary strategy and priority. */
export function chooseTherapeuticIntent(
  ctx: SafeStrategyContext,
  primaryStrategy: TherapeuticStrategy,
  priority: StrategyPriorityKey
): TherapeuticIntent {
  const overrideKey = intentOverrideKey(ctx, priority);
  return intentForStrategy(primaryStrategy, overrideKey);
}
