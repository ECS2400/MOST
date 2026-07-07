import type { BreakthroughType, SessionBreakthroughRecord, SessionMemory } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sanitizeBreakthroughRecord(value: unknown): SessionBreakthroughRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== 'string') return null;

  const evidenceRefIds = Array.isArray(record.evidenceRefIds)
    ? record.evidenceRefIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    type: record.type as BreakthroughType,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0,
    turnNumber: typeof record.turnNumber === 'number' ? record.turnNumber : 0,
    participant: record.participant === 'partner' ? 'partner' : 'host',
    sourceEventId: typeof record.sourceEventId === 'string' ? record.sourceEventId : null,
    evidenceRefIds,
  };
}

function sanitizeBreakthroughs(value: unknown): SessionBreakthroughRecord[] {
  return asArray<unknown>(value)
    .map((entry) => sanitizeBreakthroughRecord(entry))
    .filter((entry): entry is SessionBreakthroughRecord => entry !== null);
}

/** Returns a fully populated SessionMemory resilient to partial or malformed input. */
export function normalizeMemory(memory: Partial<SessionMemory> | null | undefined): SessionMemory {
  const empty = createEmptySessionMemory();
  if (!memory || typeof memory !== 'object') return empty;

  return {
    breakthroughs: sanitizeBreakthroughs(memory.breakthroughs),
    confirmedEmotions: asArray(memory.confirmedEmotions),
    confirmedNeeds: asArray(memory.confirmedNeeds),
    recurringNeeds: asArray(memory.recurringNeeds),
    interventionHistory: asArray(memory.interventionHistory),
    effectivePatterns: asArray(memory.effectivePatterns),
    ineffectivePatterns: asArray(memory.ineffectivePatterns),
    completedGoals: asArray(memory.completedGoals),
    closedTopics: asArray(memory.closedTopics),
    openTopics: asArray(memory.openTopics),
    recentInterventionTypes: asArray(memory.recentInterventionTypes),
    askedInterventionSignatures: asArray(memory.askedInterventionSignatures),
    regressHistory: asArray(memory.regressHistory),
    goalTransitionHistory: asArray(memory.goalTransitionHistory),
    lastGoalTransitionReason:
      typeof memory.lastGoalTransitionReason === 'string' ? memory.lastGoalTransitionReason : null,
    reflectionLog: asArray(memory.reflectionLog),
  };
}
