import type { InterventionType } from '@/types/mediator';
import { buildInterventionCandidateSet } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/buildInterventionCandidateSet';
import { ADAPTIVE_INTERVENTION_RULES } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/config/adaptiveInterventionRules';
import { scoreInterventionCandidate } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/scoreInterventionCandidate';
import type { AdaptiveInterventionSelectionInput } from '@/services/mediatorEngine/decision/adaptiveInterventionSelection/types';

function isPermitted(type: InterventionType, permitted: readonly InterventionType[]): boolean {
  return permitted.includes(type);
}

/** Chooses an intervention type adaptively, falling back to the legacy baseline. */
export function chooseAdaptiveInterventionType(
  input: AdaptiveInterventionSelectionInput | null | undefined
): InterventionType {
  const baselineType = input?.baselineType;
  if (!input || !baselineType || typeof baselineType !== 'string') {
    return baselineType ?? 'deescalate';
  }

  if (input.safetyActive) {
    return baselineType;
  }

  const permitted = Array.isArray(input.permitted)
    ? input.permitted.filter((type): type is InterventionType => typeof type === 'string')
    : [];

  if (permitted.length === 0) {
    return baselineType;
  }

  const candidates = buildInterventionCandidateSet(permitted, baselineType);
  if (candidates.length === 0) {
    return baselineType;
  }

  const scored = candidates.map((candidate) => scoreInterventionCandidate(input, candidate));
  const baselineEntry = scored.find((entry) => entry.candidate.type === baselineType);
  const baselineScore = baselineEntry?.score ?? 0;

  let best = baselineEntry ?? scored[0];
  for (const entry of scored) {
    if (entry.score > best.score) {
      best = entry;
    }
  }

  const { MIN_SCORE, MIN_ADAPTIVE_DELTA } = ADAPTIVE_INTERVENTION_RULES;
  const adaptiveWins =
    best.candidate.type !== baselineType &&
    best.score >= MIN_SCORE &&
    best.score > baselineScore + MIN_ADAPTIVE_DELTA;

  const selected = adaptiveWins ? best.candidate.type : baselineType;

  if (!isPermitted(selected, permitted)) {
    return baselineType;
  }

  return selected;
}
