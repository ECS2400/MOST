import type { InterventionSignature, InterventionType, SessionMemory } from '@/types/mediator';

export interface RecentInterventionSummary {
  recentInterventionTypes: InterventionType[];
  recentSignatures: InterventionSignature[];
}

/** Extracts bounded recent intervention types and signatures from session memory. */
export function summarizeRecentInterventions(
  memory: SessionMemory | null | undefined
): RecentInterventionSummary {
  const recentInterventionTypes = Array.isArray(memory?.recentInterventionTypes)
    ? memory.recentInterventionTypes.filter((type): type is InterventionType => typeof type === 'string')
    : [];

  const recentSignatures = Array.isArray(memory?.askedInterventionSignatures)
    ? memory.askedInterventionSignatures.filter(
        (sig): sig is InterventionSignature => typeof sig === 'string'
      )
    : [];

  return { recentInterventionTypes, recentSignatures };
}
