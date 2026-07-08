import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import type { TherapeuticStrategy } from '@/types/mediator/engineTypes';

export function dedupePreservingOrder<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const deduped: T[] = [];

  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      deduped.push(item);
    }
  }

  return deduped;
}

export function extractActualStrategies(run: ConversationRunResult): TherapeuticStrategy[] {
  const rawStrategies = run.turns.map((turn) => turn.strategy);
  return dedupePreservingOrder(rawStrategies);
}
