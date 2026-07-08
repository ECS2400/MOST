import type { ConversationRunResult } from '@/services/mediatorEngine/evaluation/types';
import type { InterventionType } from '@/types/mediator/engineTypes';

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

export function extractActualInterventions(run: ConversationRunResult): InterventionType[] {
  const rawInterventions = run.turns.map((turn) => turn.interventionType);
  return dedupePreservingOrder(rawInterventions);
}
