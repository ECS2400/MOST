export type {
  ContinuityContext,
} from '@/types/mediator/continuity';

export interface BuildContinuityContextInput {
  sessionMemory: import('@/types/mediator').SessionMemory | null | undefined;
  recommendedInterventionType?: import('@/types/mediator').InterventionType;
}
