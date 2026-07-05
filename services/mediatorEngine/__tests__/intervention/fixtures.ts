import type { InterventionEngineInput } from '@/types/mediator';
import { createEmptyDecisionOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createBaselineMediationState } from '@/services/mediatorEngine/__tests__/decision/fixtures';

export function createInterventionInput(
  overrides: Partial<InterventionEngineInput> = {}
): InterventionEngineInput {
  const turnNumber = overrides.turnNumber ?? 5;
  return {
    state: createBaselineMediationState(),
    intent: {
      intent: 'help_partner_feel_heard',
      goal: 'EMOTION_NAMING',
      strategy: 'validate_emotions',
      targetParticipant: 'both',
      addressesCheckId: null,
      confidence: 75,
    },
    decision: {
      ...createEmptyDecisionOutput(),
      selectedInterventionType: 'validate',
      intent: 'help_partner_feel_heard',
      strategy: 'validate_emotions',
      goalTransition: 'stay',
      rationale: 'intervention=validate',
    },
    turnNumber,
    ...overrides,
  };
}
