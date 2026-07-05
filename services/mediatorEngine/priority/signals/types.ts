import type { InterventionType, PrioritySignalType } from '@/types/mediator';
import type { ConfidenceValue } from '@/types/mediator';
import type { PriorityInput } from '@/types/mediator';

/** Draft priority signal before registry finalization. */
export interface PrioritySignalDraft {
  type: PrioritySignalType;
  priority: number;
  confidence: ConfidenceValue<boolean>;
  reason: string;
  recommendedInterventionType: InterventionType;
}

/** Context passed to each signal collector. */
export interface PrioritySignalContext {
  input: PriorityInput;
}

/** Single priority signal collector — extensible registry entry. */
export interface PrioritySignalCollector {
  type: PrioritySignalType;
  collect: (ctx: PrioritySignalContext) => PrioritySignalDraft | null;
}
