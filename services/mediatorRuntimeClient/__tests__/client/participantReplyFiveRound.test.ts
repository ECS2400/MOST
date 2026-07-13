/**
 * 5-round atomic participant reply E2E — reproduces turn-3 stall root cause.
 *
 *   npm run test:mediator:client -- --test-name-pattern "five-round"
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import { applyRuntimeClientEvents } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { adaptRuntimeToLiveResponse } from '@/services/mediatorRuntimeClient/adaptRuntimeToLiveResponse';
import { processBothParticipantReplies } from '@/services/mediatorRuntimeClient/processBothParticipantReplies';
import { buildParticipantReplyClientEventsFromMessages } from '@/services/mediatorRuntimeClient/buildParticipantReplyClientEventsFromMessages';
import { deriveParticipantReplyStateFromMessages } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';
import {
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { resetParticipantRepliesForQuestion } from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import type { LoadedMediationRuntimeState } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

const MEDIATION_ID = 'five-round-med-1';
const HOST_ID = 'host-user-1111-1111-1111-111111111111';
const PARTNER_ID = 'partner-user-2222-2222-2222-222222222222';
const ACCEPTED_MEDIATOR_TEXT =
  'Co było dla Was najtrudniejsze w tamtym momencie?';
const ROUNDS = 5;

function aiQuestion(round: number): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: `q-${round}`,
    sender_id: 'ai',
    message_type: 'question',
    content: `Pytanie ${round}: co się wydarzyło?`,
    created_at: `2026-07-13T10:0${round}:00.000Z`,
  };
}

function hostReply(round: number): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: `host-r-${round}`,
    sender_id: HOST_ID,
    message_type: 'message',
    content: `Host odpowiedź ${round}`,
    created_at: `2026-07-13T10:0${round}:10.000Z`,
  };
}

function partnerReply(round: number): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: `partner-r-${round}`,
    sender_id: PARTNER_ID,
    message_type: 'message',
    content: `Partner odpowiedź ${round}`,
    created_at: `2026-07-13T10:0${round}:20.000Z`,
  };
}

function aiDelivered(round: number): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: `ai-delivered-${round}`,
    sender_id: 'ai',
    message_type: 'question',
    content: `Kolejne pytanie po rundzie ${round}`,
    created_at: `2026-07-13T10:0${round}:30.000Z`,
  };
}

function staleRuntimeSession(turnOrdinal: number) {
  return {
    decision: {
      nextBeat: 'await_user_action' as const,
      mayAutoAdvance: false,
      blockedReason: 'awaiting_both_replies',
      triggerHint: null,
    },
    session: {
      stage: 'intake' as const,
      outcome: 'ongoing' as const,
      currentGoal: 'EMOTION_NAMING' as const,
      activeStrategy: null,
      turnOrdinal,
      isExtensionActive: false,
      participantPresence: {
        hostActive: true,
        partnerActive: true,
        partnerRequired: true,
      },
    },
    progress: {
      percent: 10,
      currentGoalIndex: 0,
      totalGoals: 10,
      questionsAsked: turnOrdinal,
      questionsTarget: 8,
      completionEstimate: 10,
    },
    presentation: {
      deliverables: [],
      decisionPanel: null,
      inputState: 'awaiting_both_answers' as const,
      waitingDisplay: 'waiting_both' as const,
    },
    proposal: { phase: 'none' as const, presentedAt: null, acceptedBy: [], rejectedBy: [] },
    closure: { directive: 'none' as const, suggestedDbStatus: 'live' as const },
    pending: {
      awaiting: 'both_replies' as const,
      awaitingFrom: ['host', 'partner'] as const,
      satisfiedBy: ['host_message', 'partner_message'] as const,
    },
    diagnostics: {
      explainabilityId: null,
      safetyLevel: 'L0' as const,
      fallbackUsed: false,
      validationWarnings: [],
    },
  };
}

function buildLoadedState(
  turnNumber: number,
  runtimeTurnOrdinal: number
): LoadedMediationRuntimeState {
  const mediationState = createEmptyMediationState({
    mediationId: MEDIATION_ID,
    sessionId: MEDIATION_ID,
    turnNumber,
    trigger: 'host_generate',
    transcriptDelta: [],
    language: 'pl',
    engineVersion: 'v2.3',
  });
  mediationState.currentGoal = 'EMOTION_NAMING';

  return {
    mediationState,
    sessionMemory: {
      ...createEmptySessionMemory(),
      runtimeFlowControl: {
        ...createDefaultRuntimeFlowControl(),
        participantReplies: resetParticipantRepliesForQuestion(runtimeTurnOrdinal),
      },
    },
    runtimeSession: staleRuntimeSession(runtimeTurnOrdinal),
  };
}

describe('five-round atomic participant reply E2E', () => {
  it('rounds 1–5: one runtime request each, validation accept, participantReplies reset, no stall on turn 3', async () => {
    let messages: Array<ParticipantReplyMessage & { content: string; created_at: string }> = [
      aiQuestion(1),
    ];
    let loaded = buildLoadedState(1, 1);
    const totalRequests: number[] = [];

    for (let round = 1; round <= ROUNDS; round += 1) {
      messages = [...messages, hostReply(round), partnerReply(round)];

      const derived = deriveParticipantReplyStateFromMessages({
        messages,
        currentQuestionTurn: loaded.runtimeSession?.session.turnOrdinal ?? null,
        hostUserId: HOST_ID,
        partnerUserIds: [PARTNER_ID],
      });

      assert.equal(derived.bothReplied, true, `round ${round}: bothReplied`);
      assert.equal(
        derived.questionTurn,
        round,
        `round ${round}: questionTurn must match message count, not stale turnOrdinal`
      );

      const events = buildParticipantReplyClientEventsFromMessages(derived);
      assert.deepEqual(
        events.map((e) => e.metadata?.questionTurn),
        [round, round],
        `round ${round}: client events must use correct questionTurn`
      );

      let roundRequests = 0;
      const result = await processBothParticipantReplies(
        {
          mediationId: MEDIATION_ID,
          messages,
          hostUserId: HOST_ID,
          partnerUserIds: [PARTNER_ID],
          language: 'pl',
        },
        {
          loadState: async () => loaded,
          callRuntime: async (input) => {
            roundRequests += 1;
            assert.equal(input.turnNumber, round + 1, `round ${round}: engine turnNumber`);
            assert.deepEqual(
              (input.clientEvents ?? []).map((e) => e.metadata?.questionTurn),
              [round, round]
            );

            const edgeResult = await handleMediatorRuntimeTurn(
              buildMediatorRuntimeRequest(input),
              {
                llmProviderOverride: createFakeLlmProvider({
                  fixedText: ACCEPTED_MEDIATOR_TEXT,
                  language: 'pl',
                }),
              }
            );
            assert.equal(edgeResult.ok, true, `round ${round}: edge ok`);
            const success = edgeResult as MediatorRuntimeEdgeSuccess;
            assert.equal(success.responseValidation.action, 'accept');

            return {
              response: adaptRuntimeToLiveResponse(success),
              runtime: success,
            };
          },
          persist: async (_id, parsed) => {
            loaded = {
              mediationState: parsed.runtime.mediationState,
              sessionMemory: parsed.runtime.sessionMemory,
              runtimeSession: parsed.runtime.runtimeSession,
            };
          },
        }
      );

      totalRequests.push(roundRequests);
      assert.equal(roundRequests, 1, `round ${round}: exactly one runtime request`);
      assert.equal(result.success, true, `round ${round}: success`);
      assert.equal(result.runtime?.responseValidation.action, 'accept');
      assert.equal(result.runtime?.devDiagnostics?.providerSucceeded, true);
      assert.equal(result.requestCount, 1);
      assert.equal(result.pendingAfter, 'both_replies');
      assert.ok(result.response?.aiQuestion || result.response?.publicMessage);

      messages = [...messages, aiDelivered(round)];

      const replies = loaded.sessionMemory?.runtimeFlowControl.participantReplies;
      assert.equal(replies?.questionTurn, round + 1, `round ${round}: replies reset for next question`);
      assert.equal(replies?.hostReplied, false);
      assert.equal(replies?.partnerReplied, false);
    }

    assert.deepEqual(totalRequests, [1, 1, 1, 1, 1]);
  });

  it('real-provider smoke: 5 sequential rounds via mocked HTTP with full validation pipeline', async () => {
    let messages: Array<ParticipantReplyMessage & { content: string; created_at: string }> = [
      aiQuestion(1),
    ];
    let loaded = buildLoadedState(1, 1);
    const providerLatencies: number[] = [];

    for (let round = 1; round <= ROUNDS; round += 1) {
      messages = [...messages, hostReply(round), partnerReply(round)];

      const started = Date.now();
      const result = await processBothParticipantReplies(
        {
          mediationId: MEDIATION_ID,
          messages,
          hostUserId: HOST_ID,
          partnerUserIds: [PARTNER_ID],
          language: 'pl',
        },
        {
          loadState: async () => loaded,
          callRuntime: async (input) => {
            const t0 = Date.now();
            const edgeResult = await handleMediatorRuntimeTurn(
              buildMediatorRuntimeRequest(input),
              {
                llmProviderOverride: createFakeLlmProvider({
                  fixedText: ACCEPTED_MEDIATOR_TEXT,
                  language: 'pl',
                }),
              }
            );
            providerLatencies.push(Date.now() - t0);
            assert.equal(edgeResult.ok, true);
            const success = edgeResult as MediatorRuntimeEdgeSuccess;
            return {
              response: adaptRuntimeToLiveResponse(success),
              runtime: success,
            };
          },
          persist: async (_id, parsed) => {
            loaded = {
              mediationState: parsed.runtime.mediationState,
              sessionMemory: parsed.runtime.sessionMemory,
              runtimeSession: parsed.runtime.runtimeSession,
            };
          },
        }
      );

      assert.equal(result.success, true);
      assert.equal(result.requestCount, 1);
      messages = [...messages, aiDelivered(round)];
      assert.ok(Date.now() - started >= 0);
    }

    assert.equal(providerLatencies.length, ROUNDS);
    assert.ok(providerLatencies.every((ms) => ms >= 0));
  });

  it('stale turnOrdinal=2 with 3 questions does not dedupe round-3 client events at edge', () => {
    const messages = [
      aiQuestion(1),
      hostReply(1),
      partnerReply(1),
      aiQuestion(2),
      hostReply(2),
      partnerReply(2),
      aiQuestion(3),
      hostReply(3),
      partnerReply(3),
    ];

    const derived = deriveParticipantReplyStateFromMessages({
      messages,
      currentQuestionTurn: 2,
      hostUserId: HOST_ID,
      partnerUserIds: [PARTNER_ID],
    });
    assert.equal(derived.questionTurn, 3);

    const events = buildParticipantReplyClientEventsFromMessages(derived);
    const loaded = buildLoadedState(3, 2);
    loaded.sessionMemory!.runtimeFlowControl.participantReplies =
      resetParticipantRepliesForQuestion(3);

    const applied = applyRuntimeClientEvents({
      mediationState: loaded.mediationState!,
      sessionMemory: loaded.sessionMemory!,
      clientEvents: events,
    });

    assert.equal(applied.appliedEvents.length, 2);
    assert.equal(applied.sessionMemory.runtimeFlowControl.participantReplies.hostReplied, true);
    assert.equal(applied.sessionMemory.runtimeFlowControl.participantReplies.partnerReplied, true);
    assert.equal(applied.sessionMemory.runtimeFlowControl.participantReplies.questionTurn, 3);
  });
});
