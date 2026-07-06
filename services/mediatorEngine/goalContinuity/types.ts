import type {
  MediationState,
  ReflectionOutput,
  SafetyOutput,
  SessionMemory,
  TurnNumber,
} from '@/types/mediator';

export interface BuildGoalContinuityContextInput {
  state: MediationState | null | undefined;
  sessionMemory: SessionMemory | null | undefined;
  reflection: ReflectionOutput | null | undefined;
  safety: SafetyOutput | null | undefined;
  turnNumber: TurnNumber;
  /** Last known compliance from prior turn memory, when available. */
  lastComplianceCompliant?: boolean | null;
}
