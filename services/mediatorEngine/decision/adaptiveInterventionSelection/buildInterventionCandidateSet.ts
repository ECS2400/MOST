import type { InterventionType } from '@/types/mediator';
import type { InterventionCandidate } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/types';

/** Builds the candidate set from permitted intervention types. */
export function buildInterventionCandidateSet(
  permitted: readonly InterventionType[],
  baselineType: InterventionType
): InterventionCandidate[] {
  if (!Array.isArray(permitted) || permitted.length === 0) return [];

  const seen = new Set<InterventionType>();
  const candidates: InterventionCandidate[] = [];

  for (const type of permitted) {
    if (typeof type !== 'string' || seen.has(type)) continue;
    seen.add(type);
    candidates.push({
      type,
      kind: type === baselineType ? 'baseline' : 'alternative',
    });
  }

  if (!seen.has(baselineType)) {
    candidates.push({ type: baselineType, kind: 'baseline' });
  }

  return candidates;
}
