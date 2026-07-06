import type { InterventionType, SessionMemory } from '@/types/mediator';

export interface InterventionEffectivenessScore {
  effectivePatterns: InterventionType[];
  ineffectivePatterns: InterventionType[];
  lastEffectiveInterventionType: InterventionType | null;
  lastIneffectiveInterventionType: InterventionType | null;
}

function lastTypeWithEffectiveness(
  memory: SessionMemory,
  effective: boolean
): InterventionType | null {
  const history = Array.isArray(memory.interventionHistory) ? memory.interventionHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry?.effective === effective && typeof entry.type === 'string') {
      return entry.type;
    }
  }
  return null;
}

/** Scores effective and ineffective intervention patterns from session memory. */
export function scoreInterventionEffectiveness(
  memory: SessionMemory | null | undefined
): InterventionEffectivenessScore {
  if (!memory) {
    return {
      effectivePatterns: [],
      ineffectivePatterns: [],
      lastEffectiveInterventionType: null,
      lastIneffectiveInterventionType: null,
    };
  }

  const effectivePatterns = Array.isArray(memory.effectivePatterns)
    ? memory.effectivePatterns.filter((type): type is InterventionType => typeof type === 'string')
    : [];
  const ineffectivePatterns = Array.isArray(memory.ineffectivePatterns)
    ? memory.ineffectivePatterns.filter((type): type is InterventionType => typeof type === 'string')
    : [];

  return {
    effectivePatterns,
    ineffectivePatterns,
    lastEffectiveInterventionType: lastTypeWithEffectiveness(memory, true),
    lastIneffectiveInterventionType: lastTypeWithEffectiveness(memory, false),
  };
}
