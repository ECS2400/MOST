import type { InterventionType } from '@/types/mediator/engineTypes';

export interface InterventionEvaluation {
  expectedInterventions: InterventionType[];
  actualInterventions: InterventionType[];
  matchedInterventions: InterventionType[];
  missingInterventions: InterventionType[];
  unexpectedInterventions: InterventionType[];
  coverage: number;
  exactMatch: boolean;
}
