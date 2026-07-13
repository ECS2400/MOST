export interface BothRepliesAtomicTurnDevLogPayload {
  phase: 'both_replies_atomic_turn';
  questionTurn: number | null;
  eventKinds: string[];
  stateTurnBefore: number | null;
  runtimeHttpStarted: boolean;
  runtimeHttpSucceeded: boolean;
  source: 'llm' | 'fallback' | 'none';
  fallbackUsed: boolean;
  nextBeatAfter: string;
  pendingAfter: string;
}

export function logBothRepliesAtomicTurnDev(payload: BothRepliesAtomicTurnDevLogPayload): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[bothRepliesAtomicTurn]', payload);
}
