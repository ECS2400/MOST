import type { Intervention, InterventionEngineInput } from '@/types/mediator';
import {
  createIntervention,
  normalizeInterventionInput,
} from '@/services/mediatorEngine/intervention/factory/createIntervention';

/** Builds a complete intervention from engine input. */
export function buildIntervention(input: InterventionEngineInput): Intervention {
  const params = normalizeInterventionInput(input);
  return createIntervention(params);
}

/** Last-resort intervention when input normalization fails. */
export function createMinimalIntervention(turnNumber = 1): Intervention {
  return createIntervention({
    turnNumber,
    type: 'reflect',
    target: 'both',
    goal: 'SAFE_OPENING',
    intent: 'increase_emotional_safety',
    strategy: 'build_safety',
    generatedAt: new Date().toISOString(),
  });
}
