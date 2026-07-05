import type { TherapeuticStrategy } from '@/types/mediator';
import { strategyForGoal } from '@/services/mediatorEngine/strategy/config/goalStrategyMap';
import type { StrategyPriorityKey } from '@/services/mediatorEngine/strategy/config/strategyPriorities';
import type { SafeStrategyContext } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

export interface PrimaryStrategyChoice {
  primaryStrategy: TherapeuticStrategy;
  priority: StrategyPriorityKey;
  reasonKey: string;
}

/** Selects primary strategy using L1 priority tiers. */
export function choosePrimaryStrategy(ctx: SafeStrategyContext): PrimaryStrategyChoice {
  if (ctx.safetyActive) {
    return {
      primaryStrategy: 'build_safety',
      priority: 'SAFETY',
      reasonKey: 'safety',
    };
  }

  if (ctx.recoveryActive) {
    return {
      primaryStrategy: 'recover_misinterpretation',
      priority: 'RECOVERY',
      reasonKey: 'recovery',
    };
  }

  if (
    ctx.escalationActive ||
    ctx.blameLoopActive ||
    ctx.reflectionShift === 'deescalate'
  ) {
    const primaryStrategy: TherapeuticStrategy =
      ctx.blameLoopActive || ctx.reflectionShift === 'deescalate'
        ? 'stop_escalation'
        : 'reduce_tension';
    return {
      primaryStrategy,
      priority: 'ESCALATION',
      reasonKey: ctx.blameLoopActive ? 'blame-loop' : 'escalation',
    };
  }

  if (ctx.exhaustionActive || ctx.reflectionShift === 'slow_down' || ctx.pauseRecommended) {
    return {
      primaryStrategy: 'hold_space',
      priority: 'EXHAUSTION',
      reasonKey: ctx.pauseRecommended ? 'pause-recommended' : 'exhaustion',
    };
  }

  if (ctx.breakthroughActive) {
    return {
      primaryStrategy: 'consolidate_progress',
      priority: 'BREAKTHROUGH',
      reasonKey: 'breakthrough',
    };
  }

  return {
    primaryStrategy: strategyForGoal(ctx.currentGoal),
    priority: 'GOAL_DEFAULT',
    reasonKey: `goal:${ctx.currentGoal}`,
  };
}
