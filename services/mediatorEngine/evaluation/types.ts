import type { ComplianceResult } from '@/types/mediator/constitution';
import type {
  ExplainabilityGoalTransition,
  InterventionType,
  SafetyLevel,
  TherapeuticStrategy,
} from '@/types/mediator/engineTypes';
import type { FinalMediatorMessage } from '@/types/mediator/runtime';
import type { MediationState } from '@/types/mediator/mediationState';
import type { SessionMemory } from '@/types/mediator/sessionMemory';
import type { TherapeuticGoal } from '@/types/mediator/therapeuticGoal';

export type ConversationRunStatus = 'PASS' | 'SKIPPED' | 'FAILED';

export interface TurnTrace {
  turnNumber: number;
  speaker: 'host' | 'partner';
  inputMessage: string;
  currentGoal: TherapeuticGoal;
  strategy: TherapeuticStrategy;
  interventionType: InterventionType;
  goalTransition: ExplainabilityGoalTransition;
  sessionMemory: SessionMemory;
  mediationState: MediationState;
  finalMediatorMessage: FinalMediatorMessage;
  safetyLevel: SafetyLevel;
  compliance: ComplianceResult;
}

export interface ConversationRunResult {
  conversationId: string;
  status: ConversationRunStatus;
  executedTurns: number;
  turns: TurnTrace[];
  skipReason?: string;
  failureReason?: string;
}
