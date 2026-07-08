import type { TherapeuticStrategy } from '@/types/mediator/engineTypes';

export interface StrategyEvaluation {
  expectedStrategies: TherapeuticStrategy[];
  actualStrategies: TherapeuticStrategy[];
  matchedStrategies: TherapeuticStrategy[];
  missingStrategies: TherapeuticStrategy[];
  unexpectedStrategies: TherapeuticStrategy[];
  coverage: number;
  exactMatch: boolean;
}
