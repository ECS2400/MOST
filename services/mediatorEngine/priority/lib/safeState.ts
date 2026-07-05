import type { MediationState } from '@/types/mediator';
import type { RecoveryState } from '@/types/mediator';
import type { ConversationDynamics, EmotionalLoad } from '@/types/mediator';

/** Safely reads conversation dynamics from mediation state. */
export function getDynamics(state: MediationState | null | undefined): ConversationDynamics | null {
  if (!state || typeof state !== 'object') return null;
  const dynamics = (state as { dynamics?: unknown }).dynamics;
  if (!dynamics || typeof dynamics !== 'object') return null;
  return dynamics as ConversationDynamics;
}

/** Safely reads emotional load from mediation state. */
export function getLoad(state: MediationState | null | undefined): EmotionalLoad | null {
  if (!state || typeof state !== 'object') return null;
  const load = (state as { load?: unknown }).load;
  if (!load || typeof load !== 'object') return null;
  return load as EmotionalLoad;
}

/** Safely reads recovery state from mediation state. */
export function getRecovery(state: MediationState | null | undefined): RecoveryState | null {
  if (!state || typeof state !== 'object') return null;
  const recovery = (state as { recovery?: unknown }).recovery;
  if (!recovery || typeof recovery !== 'object') return null;
  return recovery as RecoveryState;
}

/** Safely reads escalation level from dynamics (defaults to 0). */
export function getEscalationLevel(state: MediationState | null | undefined): number {
  const dynamics = getDynamics(state);
  return typeof dynamics?.escalationLevel === 'number' ? dynamics.escalationLevel : 0;
}

/** Safely reads whether escalation is detected. */
export function isEscalationDetected(state: MediationState | null | undefined): boolean {
  return getDynamics(state)?.escalationDetected === true;
}

/** Safely reads blame loop metrics. */
export function getBlameLoopMetrics(state: MediationState | null | undefined): {
  detected: boolean;
  count: number;
} {
  const dynamics = getDynamics(state);
  return {
    detected: dynamics?.blameLoopDetected === true,
    count: typeof dynamics?.blameLoopCount === 'number' ? dynamics.blameLoopCount : 0,
  };
}

/** Safely reads breakthrough flag from dynamics. */
export function isBreakthroughDetected(state: MediationState | null | undefined): boolean {
  return getDynamics(state)?.breakthroughDetected === true;
}
