import type {
  InterventionHistoryEntry,
  SessionMemory,
  SessionMemoryUpdateInput,
} from '@/types/mediator';
import { SESSION_MEMORY_LIMITS } from '@/services/mediatorEngine/memory/config/memoryLimits';
import { summarizeComplianceResult } from '@/services/mediatorEngine/memory/lib/complianceSummary';
import {
  appendLimited,
  dedupeAppendLimited,
  prependLimited,
} from '@/services/mediatorEngine/memory/lib/listHelpers';

function inferEffectiveness(reflection: SessionMemoryUpdateInput['reflection']): {
  effective: boolean | null;
  confidence: number;
} {
  const helpful = reflection?.lastInterventionHelpful;
  if (!helpful || typeof helpful.value !== 'boolean') {
    return { effective: null, confidence: typeof helpful?.confidence === 'number' ? helpful.confidence : 0 };
  }
  return {
    effective: helpful.value,
    confidence: typeof helpful.confidence === 'number' ? helpful.confidence : 0,
  };
}

function buildInterventionHistoryEntry(input: SessionMemoryUpdateInput): InterventionHistoryEntry {
  const { intervention, reflection, complianceResult, turnNumber } = input;
  const { effective, confidence } = inferEffectiveness(reflection);

  return {
    interventionId: typeof intervention?.id === 'string' ? intervention.id : 'unknown-intervention',
    turnNumber,
    type: intervention?.type ?? 'reflect',
    goal: intervention?.goal ?? 'SAFE_OPENING',
    intent: intervention?.intent ?? 'increase_emotional_safety',
    strategy: intervention?.strategy ?? 'build_safety',
    expectedEffectId:
      typeof intervention?.expectedEffect?.id === 'string'
        ? intervention.expectedEffect.id
        : 'unknown-effect',
    signature: typeof intervention?.signature === 'string' ? intervention.signature : 'unknown',
    compliance: summarizeComplianceResult(complianceResult),
    effective,
    confidence,
  };
}

function updatePatternLists(
  memory: SessionMemory,
  interventionType: InterventionHistoryEntry['type'],
  effective: boolean | null
): Pick<SessionMemory, 'effectivePatterns' | 'ineffectivePatterns'> {
  if (effective === true) {
    return {
      effectivePatterns: appendLimited(
        memory.effectivePatterns,
        interventionType,
        SESSION_MEMORY_LIMITS.maxEffectivePatterns
      ),
      ineffectivePatterns: memory.ineffectivePatterns,
    };
  }
  if (effective === false) {
    return {
      effectivePatterns: memory.effectivePatterns,
      ineffectivePatterns: appendLimited(
        memory.ineffectivePatterns,
        interventionType,
        SESSION_MEMORY_LIMITS.maxIneffectivePatterns
      ),
    };
  }
  return {
    effectivePatterns: memory.effectivePatterns,
    ineffectivePatterns: memory.ineffectivePatterns,
  };
}

/** Appends intervention history and updates recent types, signatures, and patterns. */
export function collectInterventionMemory(
  memory: SessionMemory,
  input: SessionMemoryUpdateInput
): SessionMemory {
  const entry = buildInterventionHistoryEntry(input);
  const patterns = updatePatternLists(memory, entry.type, entry.effective);

  return {
    ...memory,
    ...patterns,
    interventionHistory: appendLimited(
      memory.interventionHistory,
      entry,
      SESSION_MEMORY_LIMITS.maxInterventionHistory
    ),
    recentInterventionTypes: prependLimited(
      memory.recentInterventionTypes,
      entry.type,
      SESSION_MEMORY_LIMITS.maxRecentInterventionTypes
    ),
    askedInterventionSignatures: dedupeAppendLimited(
      memory.askedInterventionSignatures,
      entry.signature,
      SESSION_MEMORY_LIMITS.maxAskedSignatures
    ),
  };
}
