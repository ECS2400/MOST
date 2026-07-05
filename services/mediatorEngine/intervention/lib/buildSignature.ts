import type {
  InterventionTarget,
  InterventionType,
  TherapeuticGoal,
  TherapeuticStrategy,
} from '@/types/mediator';

/** Builds a deterministic intervention signature: type|goal|target|strategy. */
export function buildSignature(input: {
  type: InterventionType;
  goal: TherapeuticGoal;
  target: InterventionTarget;
  strategy: TherapeuticStrategy;
}): string {
  return `${input.type}|${input.goal}|${input.target}|${input.strategy}`;
}
