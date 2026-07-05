import type { MediationState, TurnNumber } from '@/types/mediator';

export interface UpdateMediationStateInput {
  turnNumber: TurnNumber;
  lastUpdatedAt: string;
}

/** Returns an immutable mediation state update for meta fields. */
export function updateMediationState(
  state: MediationState,
  input: UpdateMediationStateInput
): MediationState {
  return {
    ...state,
    meta: {
      ...state.meta,
      currentTurnNumber: input.turnNumber,
      lastUpdatedAt: input.lastUpdatedAt,
    },
  };
}
