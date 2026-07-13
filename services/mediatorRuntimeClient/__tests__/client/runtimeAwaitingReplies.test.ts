import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildParticipantReplyClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import { buildLiveRuntimeTurnInput } from '@/services/mediatorRuntimeClient/liveMediationBridge';
import { resolveRuntimeGenerationFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

function runtimeAwaitingBothReplies(): RuntimeSession {
  return {
    decision: {
      nextBeat: 'await_user_action',
      mayAutoAdvance: false,
      blockedReason: 'awaiting_both_replies',
      triggerHint: null,
    },
    session: {
      stage: 'intake',
      outcome: 'ongoing',
      currentGoal: 'SAFE_OPENING',
      activeStrategy: null,
      turnOrdinal: 2,
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
      questionsAsked: 1,
      questionsTarget: 8,
    },
    presentation: {
      deliverables: [],
      decisionPanel: null,
      inputState: 'awaiting_both_answers',
      waitingDisplay: 'waiting_both',
    },
    proposal: {
      phase: 'none',
      presentedAt: null,
      acceptedBy: [],
      rejectedBy: [],
    },
    closure: {
      directive: 'none',
      suggestedDbStatus: 'live',
    },
    pending: {
      awaiting: 'both_replies',
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: ['host_message', 'partner_message'],
    },
    diagnostics: {
      explainabilityId: null,
      safetyLevel: 'L0',
      fallbackUsed: false,
      validationWarnings: [],
    },
  };
}

describe('shouldBlockRuntimeMediatorGeneration', () => {
  const runtimeSession = runtimeAwaitingBothReplies();

  it('blocks public generation while awaiting both replies', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession,
        mode: 'generate_question',
      }),
      true
    );
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession,
        mode: 'opening_summary',
        force: true,
      }),
      true
    );
  });

  it('blocks opening bootstrap while awaiting both replies even when flagged', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession,
        mode: 'opening_summary',
        force: true,
        allowOpeningBootstrap: true,
      }),
      true
    );
  });

  it('allows opening bootstrap only when runtime expects deliver_opening', () => {
    const deliverOpening = runtimeAwaitingBothReplies();
    deliverOpening.decision.nextBeat = 'deliver_opening';
    deliverOpening.pending.awaiting = 'nothing';

    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: deliverOpening,
        mode: 'opening_summary',
        force: true,
        allowOpeningBootstrap: true,
      }),
      false
    );
  });

  it('allows flow-control client actions with force', () => {
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession,
        mode: 'final_summary',
        force: true,
        clientEvents: [{ kind: 'continue_session', actor: 'host', at: '2026-07-13T10:00:00.000Z' }],
      }),
      false
    );
  });
});

describe('resolveRuntimeGenerationFlow — awaiting replies', () => {
  it('returns null while pending both_replies even if nextBeat is deliver_question', () => {
    const runtimeSession = runtimeAwaitingBothReplies();
    runtimeSession.decision.nextBeat = 'deliver_question';
    runtimeSession.decision.mayAutoAdvance = true;

    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession,
      legacyMode: 'generate_question',
    });

    assert.equal(resolution.mode, null);
    assert.equal(resolution.source, 'runtime');
  });
});

describe('participant reply client events', () => {
  it('emits host_message for host replies', () => {
    const events = buildParticipantReplyClientEvents('host', '2026-07-13T10:00:00.000Z');
    assert.deepEqual(events, [
      { kind: 'host_message', actor: 'host', at: '2026-07-13T10:00:00.000Z' },
    ]);
  });

  it('emits partner_message for partner replies', () => {
    const events = buildParticipantReplyClientEvents('partner', '2026-07-13T10:00:00.000Z');
    assert.deepEqual(events, [
      { kind: 'partner_message', actor: 'partner', at: '2026-07-13T10:00:00.000Z' },
    ]);
  });

  it('maps host answer_ack to partner_message trigger (not host_generate)', () => {
    const input = buildLiveRuntimeTurnInput({
      mediationId: 'med-1',
      sessionId: 'med-1',
      triggerMessageId: 'host-1',
      triggerContent: 'Moja odpowiedź',
      triggerCreatedAt: '2026-07-13T10:00:00.000Z',
      mode: 'answer_ack',
      senderRole: 'user',
      language: 'pl',
      turnNumber: 2,
    });

    assert.equal(input.trigger, 'partner_message');
    assert.equal(input.transcriptDelta[0]?.authorRole, 'host');
  });
});
