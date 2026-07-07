import type { ContinuityContext, InterventionType, TherapeuticStrategy } from '@/types/mediator';

export type InterventionCandidateKind = 'baseline' | 'alternative';

export interface InterventionCandidate {
  type: InterventionType;
  kind: InterventionCandidateKind;
}

export interface AdaptiveInterventionSelectionInput {
  baselineType: InterventionType;
  permitted: InterventionType[];
  recommendedInterventionType?: InterventionType;
  continuityContext?: ContinuityContext | null;
  safetyActive: boolean;
  primaryStrategy?: TherapeuticStrategy;
}

export interface ScoredInterventionCandidate {
  candidate: InterventionCandidate;
  score: number;
}
