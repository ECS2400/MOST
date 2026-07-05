import { collectBlameLoopSignal } from '@/services/mediatorEngine/priority/signals/collectBlameLoopSignal';
import { collectBreakthroughSignal } from '@/services/mediatorEngine/priority/signals/collectBreakthroughSignal';
import { collectDefaultStrategySignal } from '@/services/mediatorEngine/priority/signals/collectDefaultStrategySignal';
import { collectEscalationSignal } from '@/services/mediatorEngine/priority/signals/collectEscalationSignal';
import { collectExhaustionSignal } from '@/services/mediatorEngine/priority/signals/collectExhaustionSignal';
import { collectReadinessSignal } from '@/services/mediatorEngine/priority/signals/collectReadinessSignal';
import { collectRecoverySignal } from '@/services/mediatorEngine/priority/signals/collectRecoverySignal';
import { collectSafetySignal } from '@/services/mediatorEngine/priority/signals/collectSafetySignal';
import type {
  PrioritySignalCollector,
  PrioritySignalContext,
  PrioritySignalDraft,
} from '@/services/mediatorEngine/priority/signals/types';

/** Registry of all L1 priority signal collectors — append-only extensibility. */
export const PRIORITY_SIGNAL_COLLECTORS: readonly PrioritySignalCollector[] = [
  collectSafetySignal,
  collectEscalationSignal,
  collectRecoverySignal,
  collectBlameLoopSignal,
  collectBreakthroughSignal,
  collectExhaustionSignal,
  collectReadinessSignal,
  collectDefaultStrategySignal,
];

/** Collects all active priority signals for the current turn. */
export function collectPrioritySignals(ctx: PrioritySignalContext): PrioritySignalDraft[] {
  const signals: PrioritySignalDraft[] = [];
  for (const collector of PRIORITY_SIGNAL_COLLECTORS) {
    try {
      const draft = collector.collect(ctx);
      if (draft) signals.push(draft);
    } catch {
      // Defensive: skip collector on malformed input — default_strategy still runs last.
    }
  }
  return signals.sort((a, b) => a.priority - b.priority);
}
