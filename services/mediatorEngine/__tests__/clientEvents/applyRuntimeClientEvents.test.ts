/**
 * Runtime client event interpretation — unit tests (Phase UI-B.3d.3).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyRuntimeClientEvents,
  clientEventFingerprintDigest,
} from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { composeRuntimeSession } from '@/services/mediatorEngine/runtimeSession/composeRuntimeSession';
import { resolveRuntimeDecisionPanel } from '@/services/mediatorEngine/runtimeSession/resolveRuntimeDecisionPanel';
import { buildPromptComposerInputFromTurn } from '@/services/mediatorEngine/runtime/lib/buildPromptComposerInputFromTurn';
import { buildMediatorRuntimeEdgeSuccess } from '@/services/mediatorEngine/edge/response';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import {
  createEmptyMediationState,
  createEmptySessionMemory,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { createMinimalIntervention } from '@/services/mediatorEngine/intervention/builder/buildIntervention';
import type {
  InterventionHistoryEntry,
  MediationState,
  OrchestrateTurnRequest,
  RuntimeClientEvent,
  SessionMemory,
} from '@/types/mediator';

const BASE_REQUEST: OrchestrateTurnRequest = {
  mediationId: 'med-1',
  sessionId: 'med-1',
  turnNumber: 12,
  trigger: 'host_generate',
  transcriptDelta: [],
  language: 'en',
  engineVersion: 'v2.3',
};

const ISO = '2026-07-11T14:00:00.000Z';

function event(
  kind: RuntimeClientEvent['kind'],
  actor: RuntimeClientEvent['actor'] = 'host'
): RuntimeClientEvent {
  return { kind, actor, at: ISO };
}

function closureState(): MediationState {
  const state = createEmptyMediationState(BASE_REQUEST);
  state.currentGoal = 'CLOSURE';
  return state;
}

function withClosureSummary(memory: SessionMemory, count = 1): SessionMemory {
  const history: InterventionHistoryEntry[] = Array.from({ length: count }, (_, index) => ({
    interventionId: `closure-${index + 1}`,
    turnNumber: 10 + index,
    type: 'summarize_close',
    goal: 'CLOSURE',
    intent: 'close_session',
    strategy: 'integrate',
    expectedEffectId: 'effect-close',
    signature: `sig-${index + 1}`,
    compliance: {
      compliant: true,
      violationCount: 0,
      blockingViolationCount: 0,
      fallbackUsed: false,
      attemptNumber: 1,
    },
    effective: null,
    confidence: 0,
  }));

  return {
    ...memory,
    interventionHistory: history,
  };
}

function composeClosureSummaryInput(
  memory: SessionMemory,
  state: MediationState
) {
  const intervention = createMinimalIntervention(12);
  intervention.type = 'summarize_close';
  intervention.goal = 'CLOSURE';

  return {
    mediationState: state,
    sessionMemory: memory,
    intervention,
    finalMediatorMessage: {
      text: 'Summary text.',
      source: 'stub' as const,
      safetyLevel: 'none' as const,
      language: 'en' as const,
      turnNumber: 12,
      accepted: true,
      validationAction: 'accept' as const,
    },
    runtimeMetadata: {
      engineVersion: 'v2.3' as const,
      turnNumber: 12,
      startedAt: ISO,
      completedAt: ISO,
      durationMs: 1,
      providerId: 'deterministic-stub',
      retryCount: 0,
    },
    fallbackUsed: false,
  };
}

describe('applyRuntimeClientEvents', () => {
  it('returns unchanged output when clientEvents is empty', () => {
    const mediationState = closureState();
    const sessionMemory = withClosureSummary(createEmptySessionMemory());

    const result = applyRuntimeClientEvents({
      mediationState,
      sessionMemory,
      clientEvents: [],
    });

    assert.equal(result.appliedEvents.length, 0);
    assert.equal(result.ignoredEvents.length, 0);
    assert.deepEqual(result.sessionMemory.interventionHistory, sessionMemory.interventionHistory);
    assert.equal(result.mediationState.currentGoal, 'CLOSURE');
  });

  it('continue_session removes continue decision block and preserves memory/history', () => {
    const mediationState = closureState();
    const sessionMemory = withClosureSummary(createEmptySessionMemory());
    const historyBefore = [...sessionMemory.interventionHistory];

    const applied = applyRuntimeClientEvents({
      mediationState,
      sessionMemory,
      clientEvents: [event('continue_session')],
    });

    assert.equal(applied.appliedEvents.length, 1);
    assert.equal(
      applied.sessionMemory.runtimeFlowControl.continueAfterSummaryAcknowledged,
      true
    );
    assert.deepEqual(applied.sessionMemory.interventionHistory, historyBefore);
    assert.equal(applied.mediationState.sessionOutcome, 'in_progress');

    const runtimeSession = composeRuntimeSession(
      composeClosureSummaryInput(applied.sessionMemory, applied.mediationState)
    );

    assert.equal(runtimeSession.presentation.showDecisionPanel, null);
    assert.equal(runtimeSession.decision.blockedReason, null);
    assert.equal(runtimeSession.session.outcome, 'ongoing');
  });

  it('start_extension activates extension and sets extension outcome/next beat', () => {
    const mediationState = closureState();
    const sessionMemory = withClosureSummary(createEmptySessionMemory());

    const applied = applyRuntimeClientEvents({
      mediationState,
      sessionMemory,
      clientEvents: [event('start_extension')],
    });

    assert.equal(applied.appliedEvents.length, 1);
    assert.equal(applied.sessionMemory.runtimeFlowControl.extensionActive, true);

    const runtimeSession = composeRuntimeSession(
      composeClosureSummaryInput(applied.sessionMemory, applied.mediationState)
    );

    assert.equal(runtimeSession.session.isExtensionActive, true);
    assert.equal(runtimeSession.session.outcome, 'extension_active');
    assert.equal(runtimeSession.session.stage, 'extension');
    assert.equal(runtimeSession.decision.nextBeat, 'deliver_extension_questions');
    assert.equal(runtimeSession.pending.awaiting, 'nothing');
  });

  it('prefers start_extension flag over summarize_close count inference', () => {
    const mediationState = closureState();
    const sessionMemory = withClosureSummary(createEmptySessionMemory(), 1);

    const applied = applyRuntimeClientEvents({
      mediationState,
      sessionMemory,
      clientEvents: [event('start_extension')],
    });

    const panel = resolveRuntimeDecisionPanel({
      mediationState: applied.mediationState,
      sessionMemory: applied.sessionMemory,
      intervention: {
        ...createMinimalIntervention(12),
        type: 'summarize_close',
        goal: 'CLOSURE',
      },
      finalMediatorMessage: {
        text: 'Summary',
        source: 'stub',
        safetyLevel: 'none',
        language: 'en',
        turnNumber: 12,
        accepted: true,
        validationAction: 'accept',
      },
      runtimeOutcome: 'extension_active',
      proposalPhase: 'none',
      turnOrdinal: 12,
    });

    assert.equal(panel, null);
  });

  it('is idempotent for repeated identical events', () => {
    const continueEvent = event('continue_session');
    const first = applyRuntimeClientEvents({
      mediationState: closureState(),
      sessionMemory: withClosureSummary(createEmptySessionMemory()),
      clientEvents: [continueEvent],
    });

    const second = applyRuntimeClientEvents({
      mediationState: first.mediationState,
      sessionMemory: first.sessionMemory,
      clientEvents: [continueEvent],
    });

    assert.equal(first.appliedEvents.length, 1);
    assert.equal(second.appliedEvents.length, 0);
    assert.equal(second.ignoredEvents.length, 1);
    assert.deepEqual(second.sessionMemory.runtimeFlowControl, first.sessionMemory.runtimeFlowControl);
  });

  it('applies events deterministically in array order', () => {
    const continueEvent = event('continue_session', 'host');
    const extensionEvent = event('start_extension', 'host');

    const result = applyRuntimeClientEvents({
      mediationState: closureState(),
      sessionMemory: withClosureSummary(createEmptySessionMemory()),
      clientEvents: [continueEvent, extensionEvent],
    });

    assert.deepEqual(
      result.appliedEvents.map((entry) => entry.kind),
      ['continue_session', 'start_extension']
    );
    assert.equal(result.sessionMemory.runtimeFlowControl.continueAfterSummaryAcknowledged, true);
    assert.equal(result.sessionMemory.runtimeFlowControl.extensionActive, true);
    assert.deepEqual(result.sessionMemory.runtimeFlowControl.appliedClientEventFingerprints, [
      clientEventFingerprintDigest(continueEvent),
      clientEventFingerprintDigest(extensionEvent),
    ]);
  });

  it('ignores unsupported message client event kinds', () => {
    const result = applyRuntimeClientEvents({
      mediationState: closureState(),
      sessionMemory: withClosureSummary(createEmptySessionMemory()),
      clientEvents: [
        event('host_message'),
        event('partner_message', 'partner'),
      ],
    });

    assert.equal(result.appliedEvents.length, 0);
    assert.equal(result.ignoredEvents.length, 2);
  });
});

function proposalState(): MediationState {
  const state = createEmptyMediationState(BASE_REQUEST);
  state.currentGoal = 'AGREEMENT';
  state.agreements.sharedRule = 'Take turns speaking';
  state.agreements.hostCommitment = 'I will listen';
  state.agreements.partnerCommitment = 'I will listen too';
  return state;
}

function withProposalHistory(memory: SessionMemory): SessionMemory {
  return {
    ...memory,
    interventionHistory: [
      {
        interventionId: 'prop-1',
        turnNumber: 10,
        type: 'propose_rule',
        goal: 'AGREEMENT',
        intent: 'propose_agreement',
        strategy: 'integrate',
        expectedEffectId: 'effect-proposal',
        signature: 'sig-prop',
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
  };
}

function composeProposalInput(memory: SessionMemory, state: MediationState) {
  const intervention = createMinimalIntervention(12);
  intervention.type = 'propose_rule';
  intervention.goal = 'AGREEMENT';

  return {
    mediationState: state,
    sessionMemory: memory,
    intervention,
    finalMediatorMessage: {
      text: 'We propose a shared rule.',
      source: 'stub' as const,
      safetyLevel: 'none' as const,
      language: 'en' as const,
      turnNumber: 12,
      accepted: true,
      validationAction: 'accept' as const,
    },
    runtimeMetadata: {
      engineVersion: 'v2.3' as const,
      turnNumber: 12,
      startedAt: ISO,
      completedAt: ISO,
      durationMs: 1,
      providerId: 'deterministic-stub',
      retryCount: 0,
    },
    fallbackUsed: false,
  };
}

describe('applyRuntimeClientEvents proposal flow', () => {
  it('host acceptance stores only host vote', () => {
    const result = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [event('proposal_accepted', 'host')],
    });

    assert.equal(result.appliedEvents.length, 1);
    assert.equal(result.sessionMemory.runtimeFlowControl.proposalVotes.host, 'accepted');
    assert.equal(result.sessionMemory.runtimeFlowControl.proposalVotes.partner, 'pending');
    assert.equal(result.mediationState.agreements.acceptedByBoth, false);
    assert.equal(result.mediationState.sessionOutcome, 'in_progress');
  });

  it('partner acceptance stores only partner vote', () => {
    const result = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [event('proposal_accepted', 'partner')],
    });

    assert.equal(result.appliedEvents.length, 1);
    assert.equal(result.sessionMemory.runtimeFlowControl.proposalVotes.host, 'pending');
    assert.equal(result.sessionMemory.runtimeFlowControl.proposalVotes.partner, 'accepted');
    assert.equal(result.mediationState.agreements.acceptedByBoth, false);
  });

  it('both accepted resolves session and removes proposal decision block', () => {
    const hostAccept = event('proposal_accepted', 'host');
    const partnerAccept = event('proposal_accepted', 'partner');

    const first = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [hostAccept],
    });

    const second = applyRuntimeClientEvents({
      mediationState: first.mediationState,
      sessionMemory: first.sessionMemory,
      clientEvents: [partnerAccept],
    });

    assert.equal(second.mediationState.agreements.acceptedByBoth, true);
    assert.equal(second.mediationState.sessionOutcome, 'resolved');
    assert.equal(second.sessionMemory.runtimeFlowControl.proposalPhase, 'accepted');

    const runtimeSession = composeRuntimeSession(
      composeProposalInput(second.sessionMemory, second.mediationState)
    );

    assert.equal(runtimeSession.session.outcome, 'resolved');
    assert.equal(runtimeSession.proposal.phase, 'accepted');
    assert.equal(runtimeSession.closure.directive, 'close_on_accept');
    assert.equal(runtimeSession.closure.navigateToClosure, true);
    assert.equal(runtimeSession.presentation.showDecisionPanel, null);
    assert.equal(runtimeSession.pending.awaiting, 'nothing');
  });

  it('single acceptance keeps proposal_pending outcome and decision panel', () => {
    const applied = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [event('proposal_accepted', 'host')],
    });

    const runtimeSession = composeRuntimeSession(
      composeProposalInput(applied.sessionMemory, applied.mediationState)
    );

    assert.equal(runtimeSession.session.outcome, 'proposal_pending');
    assert.equal(runtimeSession.proposal.phase, 'presented');
    assert.equal(runtimeSession.proposal.votes.host, 'accepted');
    assert.equal(runtimeSession.proposal.votes.partner, null);
    assert.equal(runtimeSession.presentation.showDecisionPanel?.kind, 'proposal_accept_reject');
  });

  it('rejection marks proposal rejected without resolving session', () => {
    const applied = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [event('proposal_rejected', 'partner')],
    });

    assert.equal(applied.sessionMemory.runtimeFlowControl.proposalPhase, 'rejected');
    assert.equal(applied.mediationState.sessionOutcome, 'in_progress');
    assert.equal(applied.mediationState.agreements.acceptedByBoth, false);

    const runtimeSession = composeRuntimeSession(
      composeProposalInput(applied.sessionMemory, applied.mediationState)
    );

    assert.equal(runtimeSession.session.outcome, 'ongoing');
    assert.equal(runtimeSession.proposal.phase, 'rejected');
    assert.equal(runtimeSession.closure.directive, 'none');
    assert.equal(runtimeSession.presentation.showDecisionPanel, null);
    assert.notEqual(runtimeSession.decision.nextBeat, 'deliver_closure');
  });

  it('ignores proposal events when no active proposal exists', () => {
    const result = applyRuntimeClientEvents({
      mediationState: createEmptyMediationState(BASE_REQUEST),
      sessionMemory: createEmptySessionMemory(),
      clientEvents: [
        event('proposal_accepted', 'host'),
        event('proposal_rejected', 'partner'),
      ],
    });

    assert.equal(result.appliedEvents.length, 0);
    assert.equal(result.ignoredEvents.length, 2);
  });

  it('is idempotent for repeated proposal votes from the same actor', () => {
    const acceptEvent = event('proposal_accepted', 'host');

    const first = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [acceptEvent],
    });

    const second = applyRuntimeClientEvents({
      mediationState: first.mediationState,
      sessionMemory: first.sessionMemory,
      clientEvents: [acceptEvent],
    });

    assert.equal(first.appliedEvents.length, 1);
    assert.equal(second.appliedEvents.length, 0);
    assert.equal(second.ignoredEvents.length, 1);
    assert.deepEqual(second.sessionMemory.runtimeFlowControl, first.sessionMemory.runtimeFlowControl);
  });

  it('does not let acceptance override a prior rejection from the same actor', () => {
    const rejected = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: [event('proposal_rejected', 'host')],
    });

    const attemptedAccept = applyRuntimeClientEvents({
      mediationState: rejected.mediationState,
      sessionMemory: rejected.sessionMemory,
      clientEvents: [event('proposal_accepted', 'host')],
    });

    assert.equal(attemptedAccept.appliedEvents.length, 0);
    assert.equal(attemptedAccept.sessionMemory.runtimeFlowControl.proposalPhase, 'rejected');
    assert.equal(attemptedAccept.sessionMemory.runtimeFlowControl.proposalVotes.host, 'rejected');
  });

  it('resolve_session applies terminal closure from continue decision state', () => {
    const applied = applyRuntimeClientEvents({
      mediationState: closureState(),
      sessionMemory: withClosureSummary(createEmptySessionMemory()),
      clientEvents: [event('resolve_session')],
    });

    assert.equal(applied.appliedEvents.length, 1);
    assert.equal(applied.mediationState.sessionOutcome, 'resolved');
    assert.equal(applied.sessionMemory.runtimeFlowControl.sessionResolvedByEvent, true);

    const runtimeSession = composeRuntimeSession(
      composeClosureSummaryInput(applied.sessionMemory, applied.mediationState)
    );

    assert.equal(runtimeSession.session.outcome, 'resolved');
    assert.equal(runtimeSession.closure.directive, 'close_on_accept');
    assert.equal(runtimeSession.closure.suggestedDbStatus, 'resolved');
    assert.equal(runtimeSession.closure.navigateToClosure, true);
    assert.equal(runtimeSession.presentation.showDecisionPanel, null);
    assert.equal(runtimeSession.decision.nextBeat, 'deliver_closure');
  });
});

describe('applyRuntimeClientEvents transport boundaries', () => {
  it('does not embed clientEvents in prompt composer input', async () => {
    const state = closureState();
    const memory = withClosureSummary(createEmptySessionMemory());
    const applied = applyRuntimeClientEvents({
      mediationState: state,
      sessionMemory: memory,
      clientEvents: [event('continue_session')],
    });

    const orchestrated = {
      mediationState: applied.mediationState,
      sessionMemory: applied.sessionMemory,
      intervention: createMinimalIntervention(12),
      complianceResult: {
        compliant: true,
        violations: [],
        applicableRules: [],
        validatedAt: ISO,
      },
      explainability: {} as never,
      evidenceStore: {} as never,
    };

    const promptInput = buildPromptComposerInputFromTurn(
      {
        ...BASE_REQUEST,
        clientEvents: [event('continue_session')],
        mediationState: applied.mediationState,
      },
      applied.sessionMemory,
      orchestrated,
      'en'
    );

    const serialized = JSON.stringify(promptInput);
    assert.equal(serialized.includes('"clientEvents"'), false);
    assert.equal(Object.hasOwn(promptInput as object, 'clientEvents'), false);
  });

  it('does not embed raw clientEvents in Edge response', async () => {
    const output = await runMediatorEngineTurn({
      turnInput: {
        ...BASE_REQUEST,
        mediationState: proposalState(),
        clientEvents: [
          event('proposal_accepted', 'host'),
          event('proposal_accepted', 'partner'),
        ],
      },
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      language: 'en',
    });

    const edge = buildMediatorRuntimeEdgeSuccess(output);
    const serialized = JSON.stringify(edge);

    assert.equal(serialized.includes('"clientEvents"'), false);
    assert.equal(serialized.includes('proposal_accepted'), false);
    assert.equal(serialized.includes('proposal_rejected'), false);
    assert.equal(serialized.includes('resolve_session'), false);
    assert.equal(edge.runtimeSession?.session.outcome, 'resolved');
    assert.equal(edge.runtimeSession?.closure.navigateToClosure, true);
  });
});
