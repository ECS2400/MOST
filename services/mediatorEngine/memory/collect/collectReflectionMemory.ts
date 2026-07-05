import type {
  SessionMemory,
  SessionMemoryUpdateInput,
  SessionReflectionLogEntry,
} from '@/types/mediator';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import { appendLimited } from '@/services/mediatorEngine/memory/lib/listHelpers';

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function scoreOrZero(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function buildReflectionLogEntry(input: SessionMemoryUpdateInput): SessionReflectionLogEntry {
  const { reflection, turnNumber } = input;
  return {
    turnNumber,
    lastInterventionHelpful: boolOrNull(reflection?.lastInterventionHelpful?.value),
    lastInterventionHelpfulConfidence: scoreOrZero(reflection?.lastInterventionHelpful?.confidence),
    conversationMovedForward: boolOrNull(reflection?.conversationMovedForward?.value),
    conversationMovedForwardConfidence: scoreOrZero(reflection?.conversationMovedForward?.confidence),
    shouldChangeStrategy: reflection?.shouldChangeStrategy === true,
    recommendedStrategyShift: reflection?.recommendedStrategyShift ?? 'continue',
    expectedEffectEvaluation: reflection?.expectedEffectEvaluation ?? null,
  };
}

/** Appends a compact reflection log entry for the current turn. */
export function collectReflectionMemory(
  memory: SessionMemory,
  input: SessionMemoryUpdateInput
): SessionMemory {
  const entry = buildReflectionLogEntry(input);
  return {
    ...memory,
    reflectionLog: appendLimited(
      memory.reflectionLog,
      entry,
      SESSION_MEMORY_LIMITS.maxReflectionLog
    ),
  };
}
