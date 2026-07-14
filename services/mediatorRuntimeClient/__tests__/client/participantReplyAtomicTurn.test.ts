/**
 * Atomic both-replies runtime turn — two-client E2E.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFakeLlmProvider } from '@/services/mediatorEngine/llm/adapters/fakeLlmProvider';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import { adaptRuntimeToLiveResponse } from '@/services/mediatorRuntimeClient/adaptRuntimeToLiveResponse';
import {
  buildBothParticipantRepliesRuntimeRequestBody,
  processBothParticipantReplies,
} from '@/services/mediatorRuntimeClient/processBothParticipantReplies';
import { LOCALIZED_NORMAL_TEXT } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import {
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { resetParticipantRepliesForQuestion } from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import { createDefaultRuntimeFlowControl } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { runtimeAwaitingBothRepliesFixture } from '@/services/mediatorRuntimeClient/__tests__/client/runtimeSessionFixtures';
import type { LoadedMediationRuntimeState } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import type { MediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/types';
import type { ParticipantReplyMessage } from '@/services/mediatorRuntimeClient/deriveParticipantReplyStateFromMessages';

const MEDIATION_ID = 'atomic-med-1';
const HOST_ID = 'host-user-1111-1111-1111-111111111111';
const PARTNER_ID = 'partner-user-2222-2222-2222-222222222222';
const QUESTION_TURN = 2;
const CONTEXTUAL_QUESTION = 'Co było dla Was najtrudniejsze w tamtym momencie?';

function questionMessage(): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: 'q-1',
    sender_id: 'ai',
    message_type: 'question',
    content: 'Co się wydarzyło?',
    created_at: '2026-07-13T10:00:00.000Z',
  };
}

function hostReply(): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: 'host-reply-1',
    sender_id: HOST_ID,
    message_type: 'message',
    content: 'Host answer text',
    created_at: '2026-07-13T10:01:00.000Z',
  };
}

function partnerReply(): ParticipantReplyMessage & { content: string; created_at: string } {
  return {
    id: 'partner-reply-1',
    sender_id: PARTNER_ID,
    message_type: 'message',
    content: 'Partner answer text',
    created_at: '2026-07-13T10:02:00.000Z',
  };
}

function loadedRuntimeState(): LoadedMediationRuntimeState {
  const mediationState = createEmptyMediationState({
    mediationId: MEDIATION_ID,
    sessionId: MEDIATION_ID,
    turnNumber: QUESTION_TURN,
    trigger: 'host_generate',
    transcriptDelta: [],
    language: 'pl',
    engineVersion: 'v2.3',
    mediationState: null,
  });
  mediationState.currentGoal = 'EMOTION_NAMING';

  const sessionMemory = {
    ...createEmptySessionMemory(),
    interventionHistory: [
      {
        interventionId: 'q-1',
        turnNumber: QUESTION_TURN,
        type: 'open_deepen' as const,
        goal: 'EMOTION_NAMING' as const,
        intent: 'help_name_emotion' as const,
        strategy: 'validate_emotions' as const,
        expectedEffectId: 'effect-q',
        signature: 'sig-q',
        compliance: {
          compliant: true,
          violationCount: 0,
          blockingViolationCount: 0,
          fallbackUsed: false,
          attemptNumber: 1,
        },
        effective: null,
        confidence: 0,
      },
    ],
    runtimeFlowControl: {
      ...createDefaultRuntimeFlowControl(),
      participantReplies: resetParticipantRepliesForQuestion(QUESTION_TURN),
    },
  };

  return {
    mediationState,
    sessionMemory,
    runtimeSession: runtimeAwaitingBothRepliesFixture(),
  };
}

describe('processBothParticipantReplies atomic turn', () => {
  it('builds runtime request with both client events and host_generate', () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const loaded = loadedRuntimeState();
    const body = buildBothParticipantRepliesRuntimeRequestBody(
      {
        mediationId: MEDIATION_ID,
        messages,
        hostUserId: HOST_ID,
        partnerUserIds: [PARTNER_ID],
        questionTurn: QUESTION_TURN,
      },
      loaded
    );

    assert.ok(body);
    assert.equal(body?.trigger, 'host_generate');
    assert.deepEqual(
      (body?.clientEvents ?? []).map((event) => event.kind).sort(),
      ['host_message', 'partner_message']
    );
    assert.equal(body?.transcriptDelta.length, 2);
  });

  it('two clients — exactly 1 runtime request, source=llm, no deterministic fallback text', async () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const loaded = loadedRuntimeState();
    let requestCount = 0;
    let persisted = false;

    const result = await processBothParticipantReplies(
      {
        mediationId: MEDIATION_ID,
        messages,
        hostUserId: HOST_ID,
        partnerUserIds: [PARTNER_ID],
        language: 'pl',
        questionTurn: QUESTION_TURN,
      },
      {
        loadState: async () => loaded,
        callRuntime: async (input) => {
          requestCount += 1;
          const edgeResult = await handleMediatorRuntimeTurn(
            buildMediatorRuntimeRequest(input),
            {
              llmProviderOverride: createFakeLlmProvider({
                fixedText: CONTEXTUAL_QUESTION,
              }),
            }
          );
          assert.equal(edgeResult.ok, true);
          const success = edgeResult as MediatorRuntimeEdgeSuccess;
          return {
            response: adaptRuntimeToLiveResponse(success),
            runtime: success,
          };
        },
        persist: async () => {
          persisted = true;
        },
      }
    );

    assert.equal(requestCount, 1);
    assert.equal(persisted, true);
    assert.equal(result.success, true);
    assert.equal(result.source, 'llm');
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.requestCount, 1);
    assert.notEqual(result.response?.aiQuestion ?? result.response?.publicMessage, LOCALIZED_NORMAL_TEXT.pl);
    assert.match(result.response?.aiQuestion ?? '', /najtrudniejsze/i);
    assert.equal(result.pendingAfter, 'both_replies');
  });

  it('all retries fail (edge returns llm_validation_failed) → 0 AI messages, no persist', async () => {
    const messages = [questionMessage(), hostReply(), partnerReply()];
    const loaded = loadedRuntimeState();
    let requestCount = 0;
    let persisted = false;

    const result = await processBothParticipantReplies(
      {
        mediationId: MEDIATION_ID,
        messages,
        hostUserId: HOST_ID,
        partnerUserIds: [PARTNER_ID],
        language: 'pl',
        questionTurn: QUESTION_TURN,
      },
      {
        loadState: async () => loaded,
        callRuntime: async () => {
          requestCount += 1;
          throw new Error('edge_error: llm_validation_failed');
        },
        persist: async () => {
          persisted = true;
        },
      }
    );

    assert.equal(requestCount, 1);
    assert.equal(persisted, false);
    assert.equal(result.success, false);
    assert.equal(result.response, null);
    assert.equal(result.runtime, null);
    assert.notEqual(LOCALIZED_NORMAL_TEXT.pl, '');
  });

  it('does not run atomic turn until both replies exist in messages', async () => {
    const hostOnly = [questionMessage(), hostReply()];
    let requestCount = 0;

    const result = await processBothParticipantReplies(
      {
        mediationId: MEDIATION_ID,
        messages: hostOnly,
        hostUserId: HOST_ID,
        partnerUserIds: [PARTNER_ID],
        questionTurn: QUESTION_TURN,
      },
      {
        loadState: async () => loadedRuntimeState(),
        callRuntime: async () => {
          requestCount += 1;
          throw new Error('should not call runtime');
        },
        persist: async () => {},
      }
    );

    assert.equal(result.success, false);
    assert.equal(requestCount, 0);
  });
});
