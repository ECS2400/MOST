import type { SessionBreakthroughRecord, SessionMemory, SessionMemoryUpdateInput } from '@/types/mediator';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import { appendLimited } from '@/services/mediatorEngine/memory/lib/listHelpers';

function breakthroughKey(record: SessionBreakthroughRecord): string {
  return `${record.turnNumber}:${record.type}:${record.participant}`;
}

function buildSourceEventId(
  event: NonNullable<SessionMemoryUpdateInput['state']['memory']>['breakthroughHistory'][number],
  turnNumber: number
): string {
  const eventTurn = typeof event.turnNumber === 'number' ? event.turnNumber : turnNumber;
  const participant = event.participant === 'partner' ? 'partner' : 'host';
  const detectedAt = typeof event.detectedAt === 'string' ? event.detectedAt : 'unknown';
  return `breakthrough:${eventTurn}:${participant}:${event.type}:${detectedAt}`;
}

function mapBreakthroughEvent(
  event: NonNullable<SessionMemoryUpdateInput['state']['memory']>['breakthroughHistory'][number],
  turnNumber: number
): SessionBreakthroughRecord | null {
  if (!event || typeof event.type !== 'string') return null;
  return {
    type: event.type,
    confidence: typeof event.confidence === 'number' ? event.confidence : 0,
    turnNumber: typeof event.turnNumber === 'number' ? event.turnNumber : turnNumber,
    participant: event.participant === 'partner' ? 'partner' : 'host',
    sourceEventId: buildSourceEventId(event, turnNumber),
    evidenceRefIds: [],
  };
}

/** Appends breakthrough records from state without storing partner utterance text. */
export function collectBreakthroughMemory(
  memory: SessionMemory,
  input: SessionMemoryUpdateInput
): SessionMemory {
  const { state, turnNumber } = input;
  const existingKeys = new Set(memory.breakthroughs.map(breakthroughKey));
  let breakthroughs = [...memory.breakthroughs];

  const history = state?.memory?.breakthroughHistory;
  if (Array.isArray(history)) {
    for (const event of history) {
      const record = mapBreakthroughEvent(event, turnNumber);
      if (!record) continue;
      const key = breakthroughKey(record);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      breakthroughs = appendLimited(breakthroughs, record, SESSION_MEMORY_LIMITS.maxBreakthroughs);
    }
  }

  if (state?.dynamics?.breakthroughDetected === true) {
    const record: SessionBreakthroughRecord = {
      type: 'other',
      confidence: 70,
      turnNumber,
      participant: 'host',
      sourceEventId: `dynamics:${turnNumber}`,
      evidenceRefIds: [],
    };
    const key = breakthroughKey(record);
    if (!existingKeys.has(key)) {
      breakthroughs = appendLimited(breakthroughs, record, SESSION_MEMORY_LIMITS.maxBreakthroughs);
    }
  }

  return {
    ...memory,
    breakthroughs,
  };
}
