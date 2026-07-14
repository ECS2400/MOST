import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { buildBothRepliesTranscriptDelta } from '@/services/mediatorRuntimeClient/buildBothRepliesTranscriptDelta';
import { buildLiveTranscriptWindow } from '@/services/mediatorRuntimeClient/buildLiveTranscriptWindow';
import { buildParticipantReplyClientEventsFromMessages } from '@/services/mediatorRuntimeClient/buildParticipantReplyClientEventsFromMessages';
import {
  deriveParticipantReplyStateFromMessages,
  type ParticipantReplyMessage,
} from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import { logAtomicTurnPipelineDev } from '@/services/mediatorRuntimeClient/atomicTurnPipelineDevLog';
import { logBothRepliesAtomicTurnDev } from '@/services/mediatorRuntimeClient/bothRepliesAtomicTurnDevLog';
import { logParticipantReplyGateDev } from '@/services/mediatorRuntimeClient/participantReplyGateDevLog';
import type { MediatorRuntimeParsedSuccess } from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';
import {
  buildMediationRuntimePersistencePatch,
  type LoadedMediationRuntimeState,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { toRuntimeLanguage } from '@/services/mediatorRuntimeClient/liveMediationBridge';
import type { Language } from '@/constants/i18n';

export interface ProcessBothParticipantRepliesInput {
  mediationId: string;
  messages: ParticipantReplyMessage[];
  hostUserId: string;
  partnerUserIds: string[];
  language?: Language;
  questionTurn?: number | null;
  participantNames?: { hostName?: string; partnerName?: string };
}

export interface ProcessBothParticipantRepliesResult {
  success: boolean;
  response: MediatorRuntimeParsedSuccess['response'] | null;
  runtime: MediatorRuntimeParsedSuccess['runtime'] | null;
  fallbackUsed: boolean;
  source: 'llm' | 'fallback' | 'none';
  errorCode?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  retryCount?: number;
  validationReasonCodes?: string[];
  providerSucceeded?: boolean;
  requestCount: number;
  eventKinds: string[];
  questionTurn: number | null;
  pendingAfter: string;
  nextBeatAfter: string;
}

export interface ProcessBothParticipantRepliesDeps {
  loadState?: (mediationId: string) => Promise<LoadedMediationRuntimeState>;
  callRuntime?: (input: MediatorRuntimeClientInput) => Promise<MediatorRuntimeParsedSuccess>;
  persist?: (mediationId: string, parsed: MediatorRuntimeParsedSuccess) => Promise<void>;
}

async function defaultLoadState(mediationId: string): Promise<LoadedMediationRuntimeState> {
  const { loadMediationRuntimeState } = await import(
    '@/services/mediatorRuntimeClient/loadMediationRuntimeSession'
  );
  return loadMediationRuntimeState(mediationId);
}

async function defaultPersist(
  mediationId: string,
  parsed: MediatorRuntimeParsedSuccess
): Promise<void> {
  const { prepareSupabaseRequest, supabase } = await import('@/services/supabase');
  await prepareSupabaseRequest();
  const { error } = await supabase
    .from('mediations')
    .update(buildMediationRuntimePersistencePatch(parsed.runtime))
    .eq('id', mediationId);

  if (error) {
    throw new Error(error.message);
  }
}

async function defaultCallRuntime(
  input: MediatorRuntimeClientInput
): Promise<MediatorRuntimeParsedSuccess> {
  const { callMediatorRuntime } = await import(
    '@/services/mediatorRuntimeClient/mediatorRuntimeClient'
  );
  return callMediatorRuntime(input);
}

function extractDevDiagnostics(
  runtime: MediatorRuntimeParsedSuccess['runtime']
): { providerSucceeded: boolean; failedRuleIds: string[] } {
  const dev = runtime.devDiagnostics;
  return {
    providerSucceeded: dev?.providerSucceeded ?? runtime.finalMediatorMessage.source !== 'fallback',
    failedRuleIds: dev?.validationReasonCodes ?? [],
  };
}

function resolveResponseSource(
  parsed: MediatorRuntimeParsedSuccess
): { source: 'llm' | 'fallback'; fallbackUsed: boolean } {
  const fallbackUsed =
    parsed.runtime.fallbackUsed === true ||
    parsed.runtime.finalMediatorMessage.source === 'fallback';
  return {
    source: fallbackUsed ? 'fallback' : 'llm',
    fallbackUsed,
  };
}

/**
 * Atomically applies both participant replies and generates the next mediator turn
 * in a single mediator-runtime request — no pre-patch of runtimeSession.
 */
export async function processBothParticipantReplies(
  input: ProcessBothParticipantRepliesInput,
  deps: ProcessBothParticipantRepliesDeps = {}
): Promise<ProcessBothParticipantRepliesResult> {
  const loadState = deps.loadState ?? defaultLoadState;
  const callRuntime = deps.callRuntime ?? defaultCallRuntime;
  const persist = deps.persist ?? defaultPersist;

  const derived = deriveParticipantReplyStateFromMessages({
    messages: input.messages,
    hostUserId: input.hostUserId,
    partnerUserIds: input.partnerUserIds,
  });

  logParticipantReplyGateDev({
    lastMediatorQuestionId: derived.lastMediatorQuestionId,
    hostReplyMessageId: derived.hostReplyMessageId,
    partnerReplyMessageId: derived.partnerReplyMessageId,
    hostReplied: derived.hostReplied,
    partnerReplied: derived.partnerReplied,
    bothReplied: derived.bothReplied,
    triggerReason: derived.triggerReason,
    questionTurn: derived.questionTurn,
  });

  const emptyResult = (
    overrides: Partial<ProcessBothParticipantRepliesResult> = {}
  ): ProcessBothParticipantRepliesResult => ({
    success: false,
    response: null,
    runtime: null,
    fallbackUsed: false,
    source: 'none',
    requestCount: 0,
    eventKinds: [],
    questionTurn: derived.questionTurn,
    pendingAfter: 'none',
    nextBeatAfter: 'none',
    ...overrides,
  });

  if (!input.mediationId.trim() || !derived.bothReplied || derived.questionTurn == null) {
    return emptyResult();
  }

  const loaded = await loadState(input.mediationId);
  if (!loaded.mediationState || !loaded.sessionMemory) {
    return emptyResult();
  }

  const stateTurnBefore = loaded.runtimeSession?.session.turnOrdinal ?? null;
  const questionTurn = derived.questionTurn;
  if (questionTurn == null) {
    return emptyResult();
  }

  const turnOrdinalLag =
    stateTurnBefore != null && stateTurnBefore < questionTurn ? true : undefined;

  const nextTurnNumber = Math.max(1, questionTurn + 1);
  const replyClientEvents = buildParticipantReplyClientEventsFromMessages(derived);
  const eventKinds = replyClientEvents.map((event) => event.kind);

  const pipelineBase = {
    questionTurn,
    lastMediatorQuestionId: derived.lastMediatorQuestionId,
    hostReplyMessageId: derived.hostReplyMessageId,
    partnerReplyMessageId: derived.partnerReplyMessageId,
    bothReplied: true,
    atomicTurnStarted: true,
    requestBodyBuilt: false,
    edgeReached: false,
    providerCalled: false,
    providerSucceeded: false,
    providerLatencyMs: null as number | null,
    validationAction: null as string | null,
    failedRuleIds: [] as string[],
    persistenceStarted: false,
    persistenceSucceeded: false,
    aiMessageInserted: false,
    nextBeatAfter: loaded.runtimeSession?.decision.nextBeat ?? 'none',
    pendingAfter: loaded.runtimeSession?.pending.awaiting ?? 'none',
    ...(turnOrdinalLag ? { turnOrdinalLag } : {}),
  };

  const runtimeInput: MediatorRuntimeClientInput = {
    mediationId: input.mediationId,
    sessionId: input.mediationId,
    turnNumber: nextTurnNumber,
    trigger: 'host_generate',
    mediationState: loaded.mediationState,
    sessionMemory: loaded.sessionMemory,
    transcriptDelta: buildBothRepliesTranscriptDelta(
      input.messages as Array<ParticipantReplyMessage & { content: string; created_at: string }>,
      input.hostUserId,
      input.partnerUserIds,
      questionTurn
    ),
    transcriptWindow: buildLiveTranscriptWindow(
      input.messages as Array<ParticipantReplyMessage & { content: string; created_at: string; message_type: string; sender_id: string; id: string }>,
      input.hostUserId,
      input.partnerUserIds
    ),
    language: toRuntimeLanguage(input.language ?? 'pl'),
    clientEvents: replyClientEvents,
    participantNames: input.participantNames,
  };

  logAtomicTurnPipelineDev({
    ...pipelineBase,
    requestBodyBuilt: true,
  });

  logBothRepliesAtomicTurnDev({
    phase: 'both_replies_atomic_turn',
    questionTurn,
    eventKinds,
    stateTurnBefore,
    runtimeHttpStarted: true,
    runtimeHttpSucceeded: false,
    source: 'none',
    fallbackUsed: false,
    nextBeatAfter: loaded.runtimeSession?.decision.nextBeat ?? 'none',
    pendingAfter: loaded.runtimeSession?.pending.awaiting ?? 'none',
  });

  try {
    const providerStartedAt = Date.now();
    const parsed = await callRuntime(runtimeInput);
    const providerLatencyMs = Date.now() - providerStartedAt;
    const { providerSucceeded, failedRuleIds } = extractDevDiagnostics(parsed.runtime);

    logAtomicTurnPipelineDev({
      ...pipelineBase,
      requestBodyBuilt: true,
      edgeReached: true,
      providerCalled: true,
      providerSucceeded,
      providerLatencyMs,
      validationAction: parsed.runtime.responseValidation?.action ?? null,
      failedRuleIds,
      persistenceStarted: true,
    });

    await persist(input.mediationId, parsed);

    const { source, fallbackUsed } = resolveResponseSource(parsed);
    const pendingAfter = parsed.runtime.runtimeSession?.pending.awaiting ?? 'none';
    const nextBeatAfter = parsed.runtime.runtimeSession?.decision.nextBeat ?? 'none';

    logAtomicTurnPipelineDev({
      ...pipelineBase,
      requestBodyBuilt: true,
      edgeReached: true,
      providerCalled: true,
      providerSucceeded,
      providerLatencyMs,
      validationAction: parsed.runtime.responseValidation?.action ?? null,
      failedRuleIds,
      persistenceStarted: true,
      persistenceSucceeded: true,
      aiMessageInserted: true,
      nextBeatAfter,
      pendingAfter,
    });

    logBothRepliesAtomicTurnDev({
      phase: 'both_replies_atomic_turn',
      questionTurn,
      eventKinds,
      stateTurnBefore,
      runtimeHttpStarted: true,
      runtimeHttpSucceeded: true,
      source,
      fallbackUsed,
      nextBeatAfter,
      pendingAfter,
    });

    return {
      success: true,
      response: parsed.response,
      runtime: parsed.runtime,
      fallbackUsed,
      source,
      requestCount: 1,
      eventKinds,
      questionTurn,
      pendingAfter,
      nextBeatAfter,
    };
  } catch (error: unknown) {
    const { isMediatorRuntimeClientError } = await import('@/services/mediatorRuntimeClient/errors');
    const err = isMediatorRuntimeClientError(error) ? error : null;

    logAtomicTurnPipelineDev({
      ...pipelineBase,
      requestBodyBuilt: true,
      edgeReached: err?.details.edgeCode != null || err?.kind === 'http' || err?.kind === 'network',
      providerCalled: err?.details.providerSucceeded === true,
      providerSucceeded: err?.details.providerSucceeded === true,
      validationAction: err?.details.edgeCode === 'llm_validation_failed' ? 'fallback' : null,
      failedRuleIds: err?.details.validationReasonCodes ?? [],
      persistenceStarted: false,
      persistenceSucceeded: false,
      aiMessageInserted: false,
    });

    logBothRepliesAtomicTurnDev({
      phase: 'both_replies_atomic_turn',
      questionTurn,
      eventKinds,
      stateTurnBefore,
      runtimeHttpStarted: true,
      runtimeHttpSucceeded: false,
      source: 'none',
      fallbackUsed: false,
      nextBeatAfter: loaded.runtimeSession?.decision.nextBeat ?? 'none',
      pendingAfter: loaded.runtimeSession?.pending.awaiting ?? 'none',
    });
    return emptyResult({
      requestCount: 1,
      eventKinds,
      questionTurn,
      errorCode: err?.details.edgeCode,
      retryable: err?.details.retryable,
      retryAfterMs: err?.details.retryAfterMs,
      retryCount: err?.details.retryCount,
      validationReasonCodes: err?.details.validationReasonCodes,
      providerSucceeded: err?.details.providerSucceeded,
    });
  }
}

/** @internal Test helper — exposes the runtime request body without HTTP. */
export function buildBothParticipantRepliesRuntimeRequest(
  input: ProcessBothParticipantRepliesInput,
  loaded: LoadedMediationRuntimeState
): MediatorRuntimeClientInput | null {
  const derived = deriveParticipantReplyStateFromMessages({
    messages: input.messages,
    hostUserId: input.hostUserId,
    partnerUserIds: input.partnerUserIds,
  });

  if (!derived.bothReplied || derived.questionTurn == null || !loaded.mediationState || !loaded.sessionMemory) {
    return null;
  }

  const questionTurn = derived.questionTurn;
  return {
    mediationId: input.mediationId,
    sessionId: input.mediationId,
    turnNumber: Math.max(1, questionTurn + 1),
    trigger: 'host_generate',
    mediationState: loaded.mediationState,
    sessionMemory: loaded.sessionMemory,
    transcriptDelta: buildBothRepliesTranscriptDelta(
      input.messages as Array<ParticipantReplyMessage & { content: string; created_at: string }>,
      input.hostUserId,
      input.partnerUserIds,
      questionTurn
    ),
    transcriptWindow: buildLiveTranscriptWindow(
      input.messages as Array<ParticipantReplyMessage & { content: string; created_at: string; message_type: string; sender_id: string; id: string }>,
      input.hostUserId,
      input.partnerUserIds
    ),
    language: toRuntimeLanguage(input.language ?? 'pl'),
    clientEvents: buildParticipantReplyClientEventsFromMessages(derived),
    participantNames: input.participantNames,
  };
}

export function buildBothParticipantRepliesRuntimeRequestBody(
  input: ProcessBothParticipantRepliesInput,
  loaded: LoadedMediationRuntimeState
): ReturnType<typeof buildMediatorRuntimeRequest> | null {
  const runtimeInput = buildBothParticipantRepliesRuntimeRequest(input, loaded);
  return runtimeInput ? buildMediatorRuntimeRequest(runtimeInput) : null;
}
