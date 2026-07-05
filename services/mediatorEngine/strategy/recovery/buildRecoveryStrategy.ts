import type { RecoveryStrategy } from '@/types/mediator';
import type { SafeStrategyContext } from '@/services/mediatorEngine/strategy/lib/safeStrategyInput';

/** Builds recovery strategy configuration when recovery mode is active. */
export function buildRecoveryStrategy(ctx: SafeStrategyContext): RecoveryStrategy | null {
  if (!ctx.recoveryActive) return null;

  const trigger = ctx.recovery?.trigger ?? 'implicit_correction';
  const attempt = typeof ctx.recovery?.recoveryAttempt === 'number' ? ctx.recovery.recoveryAttempt : 1;

  if (attempt > 2) {
    return {
      trigger,
      primaryStrategy: 'recover_misinterpretation',
      primaryIntent: 'restore_trust_in_process',
      maxAttempts: 2,
      fallbackStrategy: 'hold_space',
      revertCheckStatuses: ['likely', 'confirmed'],
    };
  }

  return {
    trigger,
    primaryStrategy: 'recover_misinterpretation',
    primaryIntent: 'correct_misunderstanding',
    maxAttempts: 2,
    fallbackStrategy: 'hold_space',
    revertCheckStatuses: ['likely', 'confirmed'],
  };
}
