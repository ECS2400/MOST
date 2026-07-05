import type { MediationState, SafetyInput, TurnNumber } from '@/types/mediator';
import { createEmptyMediationState } from '@/services/mediatorEngine/_internal/skeletonDefaults';

/** Normalized message slice for internal pattern scanning only. */
export interface ScannableMessage {
  id: string;
  content: string;
  turnNumber: TurnNumber;
  authorRole: string;
}

/** Normalized safety evaluation context. */
export interface SafeSafetyContext {
  turnNumber: TurnNumber;
  messages: ScannableMessage[];
  stateSafetyMode: boolean;
}

function safeTranscriptDelta(value: unknown): ScannableMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ScannableMessage[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const content = typeof record.content === 'string' ? record.content : '';
    if (content.trim().length === 0) continue;

    messages.push({
      id: typeof record.id === 'string' ? record.id : `msg-${messages.length + 1}`,
      content,
      turnNumber:
        typeof record.turnNumber === 'number' && record.turnNumber > 0
          ? record.turnNumber
          : 1,
      authorRole: typeof record.authorRole === 'string' ? record.authorRole : 'unknown',
    });
  }

  return messages;
}

function normalizeState(value: unknown): MediationState {
  if (!value || typeof value !== 'object') {
    return createEmptyMediationState({
      mediationId: 'safety-fallback',
      sessionId: 'safety-fallback',
      trigger: 'partner_message',
      turnNumber: 1,
      mediationState: null,
      transcriptDelta: [],
      engineVersion: 'v2.3',
    });
  }
  return value as MediationState;
}

/** Normalizes safety input without persisting message content in output structures. */
export function safeSafetyInput(input: unknown): SafeSafetyContext {
  const raw = (input && typeof input === 'object' ? input : {}) as SafetyInput;
  const state = normalizeState(raw.state);
  const turnNumber =
    typeof raw.turnNumber === 'number' && raw.turnNumber > 0 ? raw.turnNumber : 1;

  return {
    turnNumber,
    messages: safeTranscriptDelta(raw.transcriptDelta),
    stateSafetyMode: state.dynamics?.mode === 'SAFETY',
  };
}
