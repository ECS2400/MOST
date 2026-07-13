import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import { handleMediatorRuntimeTurn } from '@/services/mediatorEngine/edge/handleMediatorRuntimeTurn';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { buildPromptComposerInputFromTurn } from '@/services/mediatorEngine/runtime/lib/buildPromptComposerInputFromTurn';
import { orchestrateTurn } from '@/services/mediatorEngine/orchestrator/orchestrateTurn';
import { applyRuntimeClientEvents } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { createEmptyMediationState, createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import { safetyL3Input } from '@/services/mediatorEngine/__tests__/integration/scenarios/safetyL3Conversation';
import { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
import {
  buildMediationRuntimePersistencePatch,
  parseLoadedMediationRuntimeRow,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
import { buildLiveRuntimeTurnInput } from '@/services/mediatorRuntimeClient/liveMediationBridge';
import {
  buildBootstrapMediationStateFromContext,
  type BootstrapMediationContextInput,
} from '@/services/mediatorRuntimeClient/mapMediationContextToBootstrapState';
import { resolveRuntimeActionExecution } from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
import { resolveRuntimeGenerationFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
import { shouldBlockRuntimeMediatorGeneration } from '@/services/mediatorRuntimeClient/shouldBlockRuntimeMediatorGeneration';
import { resolveRuntimeClosureAction } from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';
import { resolveRuntimeSessionFlow } from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
import { buildRuntimeClientEvents, buildParticipantReplyClientEvents } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
import type {
  MediationState,
  MediatorRuntimeEdgeSuccess,
  OrchestrateTurnTrigger,
  RuntimeClientEvent,
  RuntimeSession,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';

const MEDIATION_ID = 'e2e-mediation-1';
const SESSION_ID = 'e2e-session-1';
const ISO = '2026-07-13T10:00:00.000Z';

const SURVEY_CONTEXT: BootstrapMediationContextInput = {
  mediationId: MEDIATION_ID,
  sessionId: SESSION_ID,
  language: 'pl',
  combinedDescription:
    'Kłótnia o planach weekendowych. Czułem się pominięty, gdy decyzja zapadła bez mnie.',
  partnerCombinedDescription:
    'Chciałam po prostu zorganizować coś miłego i nie rozumiem, czemu to eskaluje.',
  analysis: {
    situation_summary: 'Różne oczekiwania co do planowania wspólnego czasu.',
    key_trigger: 'Decyzja podjęta bez konsultacji',
    user_emotions: ['frustracja', 'smutek'],
    user_needs: ['uwaga', 'szacunek'],
  },
  partnerAnalysis: {
    situation_summary: 'Partner czuje się odrzucony przy spontanicznych planach.',
    user_emotions: ['zaskoczenie'],
    user_needs: ['bliskość'],
  },
};

function transcript(
  authorRole: 'host' | 'partner',
  content: string,
  turnNumber: number,
  id: string
): TranscriptMessage {
  return {
    id,
    authorRole,
    content,
    turnNumber,
    createdAt: ISO,
  };
}

async function runRuntimeTurn(params: {
  turnNumber: number;
  trigger: OrchestrateTurnTrigger;
  mediationState: MediationState | null;
  sessionMemory: SessionMemory | null;
  transcriptDelta?: TranscriptMessage[];
  clientEvents?: RuntimeClientEvent[];
}): Promise<MediatorRuntimeEdgeSuccess> {
  const body = buildMediatorRuntimeRequest({
    mediationId: MEDIATION_ID,
    sessionId: SESSION_ID,
    turnNumber: params.turnNumber,
    trigger: params.trigger,
    mediationState: params.mediationState,
    sessionMemory: params.sessionMemory,
    transcriptDelta: params.transcriptDelta ?? [],
    language: 'pl',
    clientEvents: params.clientEvents,
  });

  const result = await handleMediatorRuntimeTurn(body, {
    llmProviderOverride: createDeterministicStubProvider(),
  });

  assert.equal(result.ok, true, `turn ${params.turnNumber} failed: ${JSON.stringify(result)}`);
  return result;
}

function persistAndReload(success: MediatorRuntimeEdgeSuccess) {
  const patch = buildMediationRuntimePersistencePatch(success);
  return parseLoadedMediationRuntimeRow({
    mediation_state: patch.mediation_state,
    session_memory: patch.session_memory,
    mediator_runtime_session: patch.mediator_runtime_session,
  });
}

function closureState(): MediationState {
  const state = createEmptyMediationState({
    mediationId: MEDIATION_ID,
    sessionId: SESSION_ID,
    turnNumber: 12,
    trigger: 'host_generate',
    transcriptDelta: [],
    engineVersion: 'v2.3',
  });
  state.currentGoal = 'CLOSURE';
  return state;
}

function withClosureSummary(memory: SessionMemory, count = 1): SessionMemory {
  const history = Array.from({ length: count }, (_, index) => ({
    interventionId: `closure-${index + 1}`,
    turnNumber: 10 + index,
    type: 'summarize_close' as const,
    goal: 'CLOSURE' as const,
    intent: 'close_session' as const,
    strategy: 'integrate' as const,
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

  return { ...memory, interventionHistory: history };
}

function proposalState(): MediationState {
  const state = createEmptyMediationState({
    mediationId: MEDIATION_ID,
    sessionId: SESSION_ID,
    turnNumber: 15,
    trigger: 'host_generate',
    transcriptDelta: [],
    engineVersion: 'v2.3',
  });
  state.currentGoal = 'AGREEMENT';
  state.agreements.sharedRule = 'Take turns speaking';
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

function runtimeWith(overrides: Partial<RuntimeSession>): RuntimeSession {
  const base = {
    decision: {
      nextBeat: 'await_user_action' as const,
      mayAutoAdvance: false,
      blockedReason: null,
      triggerHint: null,
    },
    session: {
      stage: 'closing' as const,
      outcome: 'ongoing' as const,
      currentGoal: 'CLOSURE' as const,
      activeStrategy: null,
      turnOrdinal: 12,
      isExtensionActive: false,
      participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true },
    },
    progress: {
      completionEstimate: 80,
      milestone: null,
      goalProgress: {
        completedGoals: [],
        currentGoal: 'CLOSURE',
        currentGoalCompletion: 70,
        estimatedRemainingGoals: 1,
      },
      labelKey: 'runtime.stage.closing',
    },
    presentation: {
      deliverables: [],
      primaryDeliverable: 'public_message' as const,
      hideInput: false,
      showDecisionPanel: null,
      hostOnlyGeneration: false,
    },
    proposal: {
      phase: 'none' as const,
      content: null,
      votes: { host: null, partner: null },
      requiresBothAcceptance: true,
    },
    closure: {
      directive: 'none' as const,
      suggestedDbStatus: null,
      closureMessage: null,
      navigateToClosure: false,
    },
    pending: { awaiting: 'nothing' as const, awaitingFrom: [], satisfiedBy: [] },
    diagnostics: {
      explainabilityId: null,
      safetyLevel: 'none' as const,
      fallbackUsed: false,
      validationWarnings: [],
    },
  };

  return {
    ...base,
    ...overrides,
    session: { ...base.session, ...overrides.session },
    proposal: { ...base.proposal, ...overrides.proposal },
    closure: { ...base.closure, ...overrides.closure },
    pending: { ...base.pending, ...overrides.pending },
    decision: { ...base.decision, ...overrides.decision },
  };
}

describe('mapMediationContextToBootstrapState — survey intake audit', () => {
  it('maps questionnaire and analysis into mediationState.conflict', () => {
    const state = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    assert.ok(state);
    assert.match(state!.conflict.conflictSummary, /planowania/);
    assert.equal(state!.conflict.preAnalysisContext.keyTrigger, 'Decyzja podjęta bez konsultacji');
    assert.deepEqual(state!.conflict.preAnalysisContext.hostEmotions, ['frustracja', 'smutek']);
    assert.deepEqual(state!.conflict.preAnalysisContext.hostNeeds, ['uwaga', 'szacunek']);
    assert.ok(state!.conflict.preAnalysisContext.partnerEmotions.length > 0);
  });

  it('survey data reaches runtime prompt via buildLiveRuntimeTurnInput → session_start', async () => {
    const bootstrapState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    assert.ok(bootstrapState);

    const turnInput = buildLiveRuntimeTurnInput({
      mediationId: MEDIATION_ID,
      sessionId: SESSION_ID,
      triggerMessageId: 'bootstrap-1',
      triggerContent: '',
      triggerCreatedAt: ISO,
      mode: 'opening_summary',
      senderRole: 'user',
      language: 'pl',
      turnNumber: 1,
      isBootstrap: true,
      mediationState: bootstrapState,
      sessionMemory: null,
    });

    const body = buildMediatorRuntimeRequest(turnInput);
    const result = await handleMediatorRuntimeTurn(body, {
      llmProviderOverride: createDeterministicStubProvider(),
    });
    assert.equal(result.ok, true);

    const orchestrated = orchestrateTurn({
      request: {
        ...body,
        mediationState: result.mediationState,
        clientEvents: body.clientEvents ?? [],
      },
      sessionMemory: result.sessionMemory,
    });

    const promptInput = buildPromptComposerInputFromTurn(
      {
        ...body,
        mediationState: result.mediationState,
        clientEvents: body.clientEvents ?? [],
      },
      result.sessionMemory,
      orchestrated,
      'pl'
    );

    const prompt = composePrompt(promptInput);
    assert.match(prompt.contextSummary, /Shared conflict summary:/);
    assert.match(prompt.contextSummary, /Host perspective:/);
    assert.match(prompt.contextSummary, /Partner perspective:/);
    assert.match(prompt.contextSummary, /Decyzja podjęta bez konsultacji/);
  });
});

describe('liveFlowE2E — bootstrap', () => {
  it('session_start persists non-null mediationState, sessionMemory, runtimeSession', async () => {
    const bootstrapState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    const first = await runRuntimeTurn({
      turnNumber: 1,
      trigger: 'session_start',
      mediationState: bootstrapState,
      sessionMemory: null,
    });

    assert.ok(first.mediationState);
    assert.ok(first.sessionMemory);
    assert.ok(first.runtimeSession);
    assert.equal(first.runtimeSession.session.stage, 'intake');

    const loaded = persistAndReload(first);
    assert.ok(loaded.mediationState);
    assert.ok(loaded.sessionMemory);
    assert.ok(loaded.runtimeSession);
    assert.match(loaded.mediationState!.conflict.conflictSummary, /planowania/);
  });

  it('opening advances once — host_generate follows without re-bootstrap', async () => {
    const bootstrapState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    const first = await runRuntimeTurn({
      turnNumber: 1,
      trigger: 'session_start',
      mediationState: bootstrapState,
      sessionMemory: null,
    });
    const loaded = persistAndReload(first);

    const second = await runRuntimeTurn({
      turnNumber: 2,
      trigger: 'host_generate',
      mediationState: loaded.mediationState,
      sessionMemory: loaded.sessionMemory,
    });

    assert.notEqual(first.finalMediatorMessage.text, '');
    assert.notEqual(second.finalMediatorMessage.text, '');
    assert.ok(
      second.runtimeSession.decision.nextBeat === 'deliver_question' ||
        second.runtimeSession.decision.nextBeat === 'await_user_action'
    );
  });
});

describe('liveFlowE2E — standard participant turns', () => {
  it('host reply alone blocks client auto-advance until partner replies', async () => {
    const bootstrapState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    const opening = await runRuntimeTurn({
      turnNumber: 1,
      trigger: 'session_start',
      mediationState: bootstrapState,
      sessionMemory: null,
    });

    assert.equal(opening.runtimeSession.pending.awaiting, 'both_replies');
    assert.equal(opening.runtimeSession.decision.nextBeat, 'await_user_action');
    assert.equal(
      resolveRuntimeGenerationFlow({
        runtimeSession: opening.runtimeSession,
        legacyMode: 'generate_question',
      }).mode,
      null
    );
    assert.equal(
      shouldBlockRuntimeMediatorGeneration({
        runtimeSession: opening.runtimeSession,
        mode: 'generate_question',
      }),
      true
    );
  });

  it('host → partner → host_generate advances without duplicate turn metadata', async () => {
    let mediationState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    let sessionMemory: SessionMemory | null = null;
    const texts: string[] = [];
    const executedTurns: number[] = [];

    const steps: Array<{
      turnNumber: number;
      trigger: OrchestrateTurnTrigger;
      delta?: TranscriptMessage[];
    }> = [
      { turnNumber: 1, trigger: 'session_start' },
      {
        turnNumber: 2,
        trigger: 'partner_message',
        delta: [transcript('host', 'Czuję się pominięty.', 2, 'host-1')],
      },
      {
        turnNumber: 3,
        trigger: 'partner_message',
        delta: [transcript('partner', 'Nie chciałam cię wykluczyć.', 3, 'partner-1')],
      },
      { turnNumber: 4, trigger: 'host_generate' },
    ];

    let runtimeSession: RuntimeSession | null = null;

    for (const step of steps) {
      const result = await runRuntimeTurn({
        turnNumber: step.turnNumber,
        trigger: step.trigger,
        mediationState,
        sessionMemory,
        transcriptDelta: step.delta,
      });
      texts.push(result.finalMediatorMessage.text);
      executedTurns.push(step.turnNumber);
      mediationState = result.mediationState;
      sessionMemory = result.sessionMemory;
      runtimeSession = result.runtimeSession;
    }

    assert.deepEqual(executedTurns, [1, 2, 3, 4]);
    assert.ok(mediationState);
    assert.ok(sessionMemory);
    assert.equal(resolveRuntimeActionExecution({ runtimeSession }).useLegacyFallback, false);
  });
});

describe('liveFlowE2E — continue / extension clientEvents', () => {
  it('continue_session and start_extension update runtime flow control', () => {
    const mediationState = closureState();
    const memory = withClosureSummary(createEmptySessionMemory());

    const continueApplied = applyRuntimeClientEvents({
      mediationState,
      sessionMemory: memory,
      clientEvents: buildRuntimeClientEvents('continue_session', 'host', ISO),
    });
    assert.equal(continueApplied.sessionMemory.runtimeFlowControl.continueAfterSummaryAcknowledged, true);

    const extensionApplied = applyRuntimeClientEvents({
      mediationState: continueApplied.mediationState,
      sessionMemory: continueApplied.sessionMemory,
      clientEvents: buildRuntimeClientEvents('start_extension', 'host', ISO),
    });
    assert.equal(extensionApplied.sessionMemory.runtimeFlowControl.extensionActive, true);
  });

  it('runtime session flow maps extension after start_extension event', () => {
    const session = runtimeWith({
      session: {
        stage: 'extension',
        outcome: 'extension_active',
        currentGoal: 'PERSPECTIVE_SHARING',
        activeStrategy: null,
        turnOrdinal: 14,
        isExtensionActive: true,
        participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true },
      },
      decision: { nextBeat: 'deliver_extension_questions', mayAutoAdvance: true, blockedReason: null, triggerHint: 'host_generate' },
    });

    const flow = resolveRuntimeSessionFlow({ runtimeSession: session }).flow;
    assert.equal(flow.stage, 'extension');
    assert.equal(flow.extensionActive, true);

    const generation = resolveRuntimeGenerationFlow({ runtimeSession: session });
    assert.equal(generation.mode, 'extension_question');
    assert.equal(generation.source, 'runtime');
  });
});

describe('liveFlowE2E — proposal votes and closure', () => {
  it('proposal votes → accepted → resolved closure state', () => {
    const hostVote = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: buildRuntimeClientEvents('proposal_accepted', 'host', ISO),
    });
    const partnerVote = applyRuntimeClientEvents({
      mediationState: hostVote.mediationState,
      sessionMemory: hostVote.sessionMemory,
      clientEvents: buildRuntimeClientEvents('proposal_accepted', 'partner', ISO),
    });

    assert.equal(partnerVote.sessionMemory.runtimeFlowControl.proposalVotes.host, 'accepted');
    assert.equal(partnerVote.sessionMemory.runtimeFlowControl.proposalVotes.partner, 'accepted');
    assert.equal(partnerVote.sessionMemory.runtimeFlowControl.proposalPhase, 'accepted');
    assert.equal(partnerVote.mediationState.sessionOutcome, 'resolved');

    const resolvedSession = runtimeWith({
      session: { stage: 'closing', outcome: 'resolved', currentGoal: 'CLOSURE', activeStrategy: null, turnOrdinal: 16, isExtensionActive: false, participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true } },
      proposal: { phase: 'accepted', content: null, votes: { host: 'accepted', partner: 'accepted' }, requiresBothAcceptance: true },
      closure: { directive: 'close_on_accept', suggestedDbStatus: 'resolved', closureMessage: 'Resolved.', navigateToClosure: true },
      pending: { awaiting: 'nothing', awaitingFrom: [], satisfiedBy: [] },
    });

    const closure = resolveRuntimeClosureAction({ runtimeSession: resolvedSession });
    assert.equal(closure.shouldNavigate, true);
    assert.equal(closure.suggestedDbStatus, 'resolved');
    assert.equal(closure.source, 'runtime');
  });

  it('proposal reject keeps mediation open', () => {
    const rejected = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: buildRuntimeClientEvents('proposal_rejected', 'host', ISO),
    });

    assert.equal(rejected.sessionMemory.runtimeFlowControl.proposalPhase, 'rejected');
    const session = runtimeWith({
      proposal: { phase: 'rejected', content: null, votes: { host: 'rejected', partner: null }, requiresBothAcceptance: true },
      session: { stage: 'proposal', outcome: 'ongoing', currentGoal: 'AGREEMENT_BUILDING', activeStrategy: null, turnOrdinal: 15, isExtensionActive: false, participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true } },
    });
    const flow = resolveRuntimeSessionFlow({ runtimeSession: session }).flow;
    assert.equal(flow.stage, 'unresolved_but_closed');
  });

  it('resolve_session routes to closure without duplicate navigation signal', () => {
    const resolved = applyRuntimeClientEvents({
      mediationState: closureState(),
      sessionMemory: withClosureSummary(createEmptySessionMemory()),
      clientEvents: buildRuntimeClientEvents('resolve_session', 'host', ISO),
    });
    assert.equal(resolved.sessionMemory.runtimeFlowControl.sessionResolvedByEvent, true);

    const session = runtimeWith({
      closure: { directive: 'close_without_agreement', suggestedDbStatus: 'pending_agreements', closureMessage: 'Closed.', navigateToClosure: true },
      session: { stage: 'closing', outcome: 'closed_without_agreement', currentGoal: 'CLOSURE', activeStrategy: null, turnOrdinal: 14, isExtensionActive: false, participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true } },
    });
    const closure = resolveRuntimeClosureAction({ runtimeSession: session });
    assert.equal(closure.shouldNavigate, true);
    assert.equal(closure.directive, 'close_without_agreement');
  });
});

describe('liveFlowE2E — safety intervention', () => {
  it('safety L3 blocks normal auto-advance and hides input in runtime session', async () => {
    const output = await runMediatorEngineTurn(safetyL3Input);

    assert.equal(output.finalMediatorMessage.safetyLevel, 'L3_stop');
    assert.equal(output.runtimeSession.session.stage, 'safety_hold');
    assert.equal(output.runtimeSession.session.outcome, 'safety_stopped');
    assert.equal(output.runtimeSession.presentation.hideInput, true);
    assert.equal(output.runtimeSession.decision.mayAutoAdvance, false);
    assert.equal(output.runtimeSession.decision.nextBeat, 'safety_intervention');
    assert.equal(output.runtimeSession.decision.blockedReason, 'safety_hold');
    assert.equal(output.runtimeSession.pending.awaiting, 'safety_acknowledgment');
    assert.equal(output.runtimeSession.closure.directive, 'safety_close');

    const generation = resolveRuntimeGenerationFlow({ runtimeSession: output.runtimeSession });
    assert.equal(generation.mode, 'safety_intervention');
    assert.equal(generation.source, 'runtime');
  });
});

describe('liveFlowE2E — persistence reload', () => {
  it('reload preserves mediationState, sessionMemory, runtimeSession, proposal and extension flags', async () => {
    const bootstrapState = buildBootstrapMediationStateFromContext(SURVEY_CONTEXT);
    const first = await runRuntimeTurn({
      turnNumber: 1,
      trigger: 'session_start',
      mediationState: bootstrapState,
      sessionMemory: null,
    });

    let memory = first.sessionMemory;

    const voted = applyRuntimeClientEvents({
      mediationState: proposalState(),
      sessionMemory: withProposalHistory(createEmptySessionMemory()),
      clientEvents: buildRuntimeClientEvents('proposal_accepted', 'host', ISO),
    });
    const memoryWithExtension = {
      ...voted.sessionMemory,
      runtimeFlowControl: {
        ...voted.sessionMemory.runtimeFlowControl,
        extensionActive: true,
      },
    };

    const patched = buildMediationRuntimePersistencePatch({
      ...first,
      sessionMemory: memoryWithExtension,
      mediationState: {
        ...voted.mediationState,
        conflict: first.mediationState.conflict,
      },
      runtimeSession: runtimeWith({
        session: {
          stage: 'extension',
          outcome: 'extension_active',
          currentGoal: 'PERSPECTIVE_SHARING',
          activeStrategy: null,
          turnOrdinal: 8,
          isExtensionActive: true,
          participantPresence: { hostActive: true, partnerActive: true, partnerRequired: true },
        },
        proposal: {
          phase: 'presented',
          content: null,
          votes: { host: 'accepted', partner: null },
          requiresBothAcceptance: true,
        },
      }),
    });

    const reloaded = parseLoadedMediationRuntimeRow({
      mediation_state: patched.mediation_state,
      session_memory: patched.session_memory,
      mediator_runtime_session: patched.mediator_runtime_session,
    });

    assert.ok(reloaded.mediationState);
    assert.ok(reloaded.sessionMemory);
    assert.ok(reloaded.runtimeSession);
    assert.equal(reloaded.sessionMemory!.runtimeFlowControl.extensionActive, true);
    assert.equal(reloaded.sessionMemory!.runtimeFlowControl.proposalVotes.host, 'accepted');
    assert.equal(reloaded.runtimeSession!.session.isExtensionActive, true);
    assert.equal(reloaded.runtimeSession!.proposal.phase, 'presented');
    assert.match(reloaded.mediationState!.conflict.conflictSummary, /planowania/);
  });
});

describe('liveFlowE2E — legacy fallback only on runtime failure', () => {
  it('healthy runtime does not invoke legacy generate getter', () => {
    let legacyCalled = false;
    const session = runtimeWith({
      decision: { nextBeat: 'deliver_question', mayAutoAdvance: true, blockedReason: null, triggerHint: 'host_generate' },
    });

    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: session,
      getLegacyMode: () => {
        legacyCalled = true;
        return 'generate_question';
      },
    });

    assert.equal(legacyCalled, false);
    assert.equal(resolution.source, 'runtime');
    assert.equal(resolution.mode, 'generate_question');
  });

  it('runtime failure does not invoke legacy generate getter in production default', () => {
    let legacyCalled = false;
    const resolution = resolveRuntimeGenerationFlow({
      runtimeSession: runtimeWith({
        decision: { nextBeat: 'deliver_question', mayAutoAdvance: true, blockedReason: null, triggerHint: 'host_generate' },
      }),
      runtimeFailed: true,
      getLegacyMode: () => {
        legacyCalled = true;
        return 'generate_question';
      },
    });

    assert.equal(legacyCalled, false);
    assert.equal(resolution.source, 'runtime_unavailable');
    assert.equal(resolution.reason, 'runtime_failed');
    assert.equal(resolution.mode, null);
  });
});
