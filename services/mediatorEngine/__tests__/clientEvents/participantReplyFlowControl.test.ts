/**
 * Participant reply flow control — unit tests.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bothParticipantRepliesSatisfied,
  createDefaultParticipantReplies,
  resetParticipantRepliesForQuestion,
  syncParticipantRepliesAfterQuestionTurn,
} from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';
import {
  applyRuntimeClientEvents,
  createDefaultRuntimeFlowControl,
} from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { composeRuntimeSession } from '@/services/mediatorEngine/runtimeSession/composeRuntimeSession';
import { createEmptyMediationState, createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createMinimalIntervention } from '@/services/mediatorEngine/intervention/builder/buildIntervention';
import type {
  InterventionHistoryEntry,
  OrchestrateTurnRequest,
  RuntimeClientEvent,
  SessionMemory,
} from '@/types/mediator';

const BASE_REQUEST: OrchestrateTurnRequest = {
  mediationId: 'med-1',
  sessionId: 'med-1',
  turnNumber: 3,
  trigger: 'host_generate',
  transcriptDelta: [],
  language: 'en',
  engineVersion: 'v2.3',
};

const ISO = '2026-07-13T10:00:00.000Z';
const QUESTION_TURN = 3;

function replyEvent(
  kind: 'host_message' | 'partner_message',
  actor: 'host' | 'partner',
  questionTurn = QUESTION_TURN
): RuntimeClientEvent {
  return { kind, actor, at: ISO, metadata: { questionTurn } };
}

function withQuestionHistory(memory: SessionMemory, turnNumber = QUESTION_TURN): SessionMemory {
  const entry: InterventionHistoryEntry = {
    interventionId: 'q-1',
    turnNumber,
    type: 'open_deepen',
    goal: 'EMOTION_NAMING',
    intent: 'deepen',
    strategy: 'explore',
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
  };

  return {
    ...memory,
    interventionHistory: [entry],
    runtimeFlowControl: {
      ...createDefaultRuntimeFlowControl(),
      participantReplies: resetParticipantRepliesForQuestion(turnNumber),
    },
  };
}

function composePendingForMemory(memory: SessionMemory): string {
  const runtime = composeRuntimeSession({
    mediationState: createEmptyMediationState(BASE_REQUEST),
    sessionMemory: memory,
    intervention: createMinimalIntervention(QUESTION_TURN),
    finalMediatorMessage: {
      text: 'Question?',
      source: 'stub',
      safetyLevel: 'none',
      language: 'en',
      turnNumber: QUESTION_TURN,
      accepted: true,
      validationAction: 'accept',
    },
    runtimeMetadata: {
      engineVersion: 'v2.3',
      turnNumber: QUESTION_TURN,
      startedAt: ISO,
      completedAt: ISO,
      durationMs: 0,
      providerId: 'stub',
      retryCount: 0,
    },
    fallbackUsed: false,
  });
  return runtime.pending.awaiting;
}

describe('participant reply flow control', () => {
  it('host only → partnerReplied false, pending stays both_replies', () => {
    const memory = withQuestionHistory(createEmptySessionMemory());
    const hostOnly = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: memory,
      clientEvents: [replyEvent('host_message', 'host')],
    });

    const replies = hostOnly.sessionMemory.runtimeFlowControl.participantReplies;
    assert.equal(replies.hostReplied, true);
    assert.equal(replies.partnerReplied, false);
    assert.equal(bothParticipantRepliesSatisfied(replies), false);
    assert.equal(composePendingForMemory(hostOnly.sessionMemory), 'both_replies');
  });

  it('partner only → hostReplied false, pending stays both_replies', () => {
    const memory = withQuestionHistory(createEmptySessionMemory());
    const partnerOnly = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: memory,
      clientEvents: [replyEvent('partner_message', 'partner')],
    });

    const replies = partnerOnly.sessionMemory.runtimeFlowControl.participantReplies;
    assert.equal(replies.hostReplied, false);
    assert.equal(replies.partnerReplied, true);
    assert.equal(composePendingForMemory(partnerOnly.sessionMemory), 'both_replies');
  });

  it('host + partner → pending nothing and nextBeat deliver_question', () => {
    const memory = withQuestionHistory(createEmptySessionMemory());
    const hostFirst = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: memory,
      clientEvents: [replyEvent('host_message', 'host')],
    });
    const both = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: hostFirst.sessionMemory,
      clientEvents: [replyEvent('partner_message', 'partner')],
    });

    const replies = both.sessionMemory.runtimeFlowControl.participantReplies;
    assert.equal(replies.hostReplied, true);
    assert.equal(replies.partnerReplied, true);
    assert.equal(bothParticipantRepliesSatisfied(replies), true);

    const runtime = composeRuntimeSession({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: both.sessionMemory,
      intervention: createMinimalIntervention(QUESTION_TURN),
      finalMediatorMessage: {
        text: 'Ack',
        source: 'stub',
        safetyLevel: 'none',
        language: 'en',
        turnNumber: QUESTION_TURN,
        accepted: true,
        validationAction: 'accept',
      },
      runtimeMetadata: {
        engineVersion: 'v2.3',
        turnNumber: QUESTION_TURN,
        startedAt: ISO,
        completedAt: ISO,
        durationMs: 0,
        providerId: 'stub',
        retryCount: 0,
      },
      fallbackUsed: false,
    });

    assert.equal(runtime.pending.awaiting, 'nothing');
    assert.equal(runtime.decision.nextBeat, 'deliver_question');
    assert.equal(runtime.decision.mayAutoAdvance, true);
  });

  it('duplicate host_message is idempotent', () => {
    const memory = withQuestionHistory(createEmptySessionMemory());
    const first = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: memory,
      clientEvents: [replyEvent('host_message', 'host')],
    });
    const second = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: first.sessionMemory,
      clientEvents: [replyEvent('host_message', 'host')],
    });

    assert.equal(second.appliedEvents.length, 0);
    assert.equal(second.ignoredEvents.length, 1);
    assert.deepEqual(
      second.sessionMemory.runtimeFlowControl.participantReplies,
      first.sessionMemory.runtimeFlowControl.participantReplies
    );
  });

  it('stale questionTurn event does not unlock a new round', () => {
    const memory = withQuestionHistory(createEmptySessionMemory(), 4);
    const stale = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: memory,
      clientEvents: [replyEvent('host_message', 'host', 3)],
    });

    assert.equal(stale.appliedEvents.length, 0);
    assert.equal(stale.sessionMemory.runtimeFlowControl.participantReplies.hostReplied, false);
  });

  it('new round resets reply flags after question intervention', () => {
    const flowControl = createDefaultRuntimeFlowControl();
    flowControl.participantReplies = {
      hostReplied: true,
      partnerReplied: true,
      questionTurn: 3,
    };

    const reset = syncParticipantRepliesAfterQuestionTurn(flowControl, 'open_deepen', 4);
    assert.deepEqual(reset.participantReplies, {
      hostReplied: false,
      partnerReplied: false,
      questionTurn: 4,
    });
  });
});

describe('participantReplies defaults', () => {
  it('createDefaultParticipantReplies starts unanswered', () => {
    assert.deepEqual(createDefaultParticipantReplies(), {
      hostReplied: false,
      partnerReplied: false,
      questionTurn: null,
    });
  });
});
