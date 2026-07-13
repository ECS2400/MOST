/** DEV-only end-to-end atomic turn diagnostics — no transcript or prompt content. */
export interface AtomicTurnPipelineDevLog {
  questionTurn: number | null;
  lastMediatorQuestionId: string | null;
  hostReplyMessageId: string | null;
  partnerReplyMessageId: string | null;
  bothReplied: boolean;
  atomicTurnStarted: boolean;
  requestBodyBuilt: boolean;
  edgeReached: boolean;
  providerCalled: boolean;
  providerSucceeded: boolean;
  providerLatencyMs: number | null;
  validationAction: string | null;
  failedRuleIds: string[];
  persistenceStarted: boolean;
  persistenceSucceeded: boolean;
  aiMessageInserted: boolean;
  nextBeatAfter: string;
  pendingAfter: string;
  /** When runtime turnOrdinal lags behind message-derived questionTurn. */
  turnOrdinalLag?: boolean;
}

export function logAtomicTurnPipelineDev(payload: AtomicTurnPipelineDevLog): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.info('[atomicTurnPipeline]', payload);
}
