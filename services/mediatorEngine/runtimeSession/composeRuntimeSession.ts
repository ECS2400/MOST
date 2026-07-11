/**
 * Runtime session composer (Phase UI-B.3b.2).
 *
 * Pure projection from engine state → {@link RuntimeSession} contract.
 * No Edge wiring, no UI, no client events in this phase.
 */

import type {
  FinalMediatorMessage,
  Intervention,
  InterventionType,
  MediationState,
  RuntimeMetadata,
  SessionMemory,
  SessionOutcome,
  TherapeuticGoal,
} from '@/types/mediator';
import type {
  MediatorBeat,
  MediatorBlockReason,
  RuntimeClientEventKind,
  RuntimeClosureDirective,
  RuntimeDecisionPanelSpec,
  RuntimeMediationDbStatus,
  RuntimePendingUserAction,
  RuntimeProposalPhase,
  RuntimeQuestionTarget,
  RuntimeSession,
  RuntimeSessionOutcome,
  RuntimeSessionStage,
  RuntimeSummaryVariant,
  RuntimeUiDeliverable,
  RuntimeUiDeliverableKind,
} from '@/types/mediator/runtimeSession';
import {
  inferExtensionActive,
  resolveRuntimeDecisionPanel,
} from '@/services/mediatorEngine/runtimeSession/resolveRuntimeDecisionPanel';

export interface ComposeRuntimeSessionInput {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  intervention: Intervention;
  finalMediatorMessage: FinalMediatorMessage;
  runtimeMetadata: RuntimeMetadata;
  fallbackUsed: boolean;
}

const THERAPEUTIC_GOAL_ORDER: readonly TherapeuticGoal[] = [
  'SAFE_OPENING',
  'EMOTION_NAMING',
  'EMOTION_UNDERSTANDING',
  'EMOTION_ACKNOWLEDGMENT',
  'NEED_NAMING',
  'PERSPECTIVE_SHARING',
  'REFRAME',
  'AGREEMENT',
  'FUTURE_PLAN',
  'CLOSURE',
];

const QUESTION_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'welcome_open',
  'choice_emotion',
  'choice_need',
  'open_deepen',
  'invite_reflection',
  'gentle_redirect_evasion',
  'remind_goal',
  'recover_acknowledge',
  'validate',
  'reflect',
  'mirror',
  'reframe',
  'redirect_blame',
  'propose_rule',
  'propose_future_plan',
]);

const SUMMARY_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'summarize_close',
  'confirm_agreement',
  'celebrate_breakthrough',
]);

const SAFETY_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'safety_response',
  'deescalate',
  'pause_session',
]);

/** Builds the full runtime-driven session contract for one completed turn. */
export function composeRuntimeSession(input: ComposeRuntimeSessionInput): RuntimeSession {
  const stage = resolveSessionStage(input.mediationState, input.sessionMemory);
  const outcome = resolveRuntimeOutcome(input.mediationState, input.sessionMemory);
  const proposalPhase = resolveProposalPhase(
    input.mediationState,
    input.sessionMemory,
    input.intervention.type
  );
  const decisionPanel = resolveRuntimeDecisionPanel({
    mediationState: input.mediationState,
    sessionMemory: input.sessionMemory,
    intervention: input.intervention,
    finalMediatorMessage: input.finalMediatorMessage,
    runtimeOutcome: outcome,
    proposalPhase,
    turnOrdinal: input.runtimeMetadata.turnNumber,
  });

  return {
    decision: composeDecision(input, outcome, decisionPanel),
    session: composeLifecycle(input, stage, outcome),
    progress: composeProgress(input, stage),
    presentation: composePresentation(input, decisionPanel),
    proposal: composeProposal(input, proposalPhase),
    closure: composeClosure(input, outcome),
    pending: composePending(input, decisionPanel),
    diagnostics: composeDiagnostics(input),
  };
}

function composeLifecycle(
  input: ComposeRuntimeSessionInput,
  stage: RuntimeSessionStage,
  outcome: RuntimeSessionOutcome
): RuntimeSession['session'] {
  const { mediationState, sessionMemory, intervention, runtimeMetadata } = input;
  const partnerUserId = mediationState.participants.partner.profile.userId;

  return {
    stage,
    outcome,
    currentGoal: mediationState.currentGoal,
    activeStrategy:
      mediationState.activeStrategy?.primary ?? intervention.strategy ?? null,
    turnOrdinal: runtimeMetadata.turnNumber,
    isExtensionActive: inferExtensionActive(sessionMemory, mediationState, intervention),
    participantPresence: {
      hostActive: true,
      partnerActive: partnerUserId.trim().length > 0,
      partnerRequired: true,
    },
  };
}

function composeDecision(
  input: ComposeRuntimeSessionInput,
  outcome: RuntimeSessionOutcome,
  decisionPanel: RuntimeDecisionPanelSpec | null
): RuntimeSession['decision'] {
  const { mediationState, intervention, finalMediatorMessage } = input;
  const pending = mediationState.pendingAction;
  const safetyHold = isSafetyHold(finalMediatorMessage.safetyLevel, intervention.type);

  if (safetyHold) {
    return {
      nextBeat: 'safety_intervention',
      mayAutoAdvance: false,
      blockedReason: 'safety_hold',
      triggerHint: null,
    };
  }

  const decisionBlockReason = mapDecisionPanelBlockReason(decisionPanel);
  if (decisionBlockReason) {
    return {
      nextBeat: 'await_user_action',
      mayAutoAdvance: false,
      blockedReason: decisionBlockReason,
      triggerHint: null,
    };
  }

  const extensionActive = inferExtensionActive(
    input.sessionMemory,
    mediationState,
    intervention
  );

  if (extensionActive && outcome === 'extension_active' && mediationState.currentGoal === 'CLOSURE') {
    if (SUMMARY_INTERVENTION_TYPES.has(intervention.type)) {
      return {
        nextBeat: 'deliver_extension_questions',
        mayAutoAdvance: true,
        blockedReason: null,
        triggerHint: 'host_generate',
      };
    }
  }

  if (outcome !== 'ongoing' && outcome !== 'extension_active' && outcome !== 'needs_extension_offer') {
    return {
      nextBeat: 'deliver_closure',
      mayAutoAdvance: false,
      blockedReason: 'session_finished',
      triggerHint: null,
    };
  }

  if (pending && pending.awaitingResponseFrom.length > 0) {
    return {
      nextBeat: 'await_user_action',
      mayAutoAdvance: false,
      blockedReason: resolvePendingBlockReason(pending.awaitingResponseFrom),
      triggerHint: null,
    };
  }

  const nextBeat = resolveNextBeatAfterIntervention(intervention.type, mediationState.currentGoal);

  if (nextBeat === 'await_user_action') {
    return {
      nextBeat,
      mayAutoAdvance: false,
      blockedReason: 'awaiting_both_replies',
      triggerHint: null,
    };
  }

  if (nextBeat === 'deliver_question' || nextBeat === 'deliver_opening') {
    return {
      nextBeat,
      mayAutoAdvance: true,
      blockedReason: null,
      triggerHint: 'host_generate',
    };
  }

  return {
    nextBeat,
    mayAutoAdvance: false,
    blockedReason: null,
    triggerHint: nextBeat === 'present_proposal' ? 'host_generate' : null,
  };
}

function composeProgress(
  input: ComposeRuntimeSessionInput,
  stage: RuntimeSessionStage
): RuntimeSession['progress'] {
  const { mediationState, sessionMemory, runtimeMetadata } = input;
  const currentGoalState = mediationState.goals.find(
    (goal) => goal.goal === mediationState.currentGoal
  );
  const completedGoals = uniqueGoals([
    ...sessionMemory.completedGoals,
    ...mediationState.goals
      .filter((goal) => goal.status === 'completed')
      .map((goal) => goal.goal),
  ]);

  const completionEstimate = estimateCompletion(
    completedGoals,
    mediationState.currentGoal,
    currentGoalState?.progressPercent ?? 0
  );

  const latestCompleted = completedGoals.at(-1) ?? null;

  return {
    completionEstimate,
    milestone: latestCompleted
      ? {
          id: latestCompleted.toLowerCase(),
          achievedAtTurn: runtimeMetadata.turnNumber,
        }
      : null,
    goalProgress: {
      completedGoals,
      currentGoal: mediationState.currentGoal,
      currentGoalCompletion: clampPercent(currentGoalState?.progressPercent ?? 0),
      estimatedRemainingGoals: Math.max(
        0,
        THERAPEUTIC_GOAL_ORDER.length - completedGoals.length - 1
      ),
    },
    labelKey: `runtime.stage.${stage}`,
  };
}

function composePresentation(
  input: ComposeRuntimeSessionInput,
  decisionPanel: RuntimeDecisionPanelSpec | null
): RuntimeSession['presentation'] {
  const deliverables = buildDeliverables(input);
  const primaryDeliverable = deliverables[0]?.kind ?? 'public_message';
  const hideInput =
    isSafetyHold(input.finalMediatorMessage.safetyLevel, input.intervention.type) ||
    input.mediationState.sessionOutcome !== 'in_progress' ||
    decisionPanel !== null;

  return {
    deliverables,
    primaryDeliverable,
    hideInput,
    showDecisionPanel: decisionPanel,
    hostOnlyGeneration: true,
  };
}

function composeProposal(
  input: ComposeRuntimeSessionInput,
  phase: RuntimeProposalPhase
): RuntimeSession['proposal'] {
  const { mediationState, intervention, finalMediatorMessage } = input;
  const agreements = mediationState.agreements;
  const flowControl = input.sessionMemory.runtimeFlowControl;

  const hasAgreementContent =
    Boolean(agreements.sharedRule?.trim()) ||
    Boolean(agreements.hostCommitment?.trim()) ||
    Boolean(agreements.partnerCommitment?.trim()) ||
    Boolean(agreements.futurePlan?.trim());

  const content =
    phase === 'none' || phase === 'preparing' || !hasAgreementContent
      ? null
      : {
          proposalId: intervention.id,
          body: finalMediatorMessage.text.trim(),
          hostCommitment: agreements.hostCommitment,
          partnerCommitment: agreements.partnerCommitment,
          sharedRule: agreements.sharedRule,
        };

  const votes =
    flowControl != null
      ? {
          host:
            flowControl.proposalVotes.host === 'pending'
              ? null
              : flowControl.proposalVotes.host,
          partner:
            flowControl.proposalVotes.partner === 'pending'
              ? null
              : flowControl.proposalVotes.partner,
        }
      : {
          host: agreements.acceptedByBoth ? 'accepted' : null,
          partner: agreements.acceptedByBoth ? 'accepted' : null,
        };

  return {
    phase,
    content,
    votes,
    requiresBothAcceptance: true,
  };
}

function composeClosure(
  input: ComposeRuntimeSessionInput,
  outcome: RuntimeSessionOutcome
): RuntimeSession['closure'] {
  const { mediationState, finalMediatorMessage } = input;
  const directive = resolveClosureDirective(outcome, finalMediatorMessage.safetyLevel);
  const suggestedDbStatus = resolveSuggestedDbStatus(outcome, mediationState.sessionOutcome);
  const terminal = directive !== 'none';

  return {
    directive,
    suggestedDbStatus,
    closureMessage: terminal ? finalMediatorMessage.text.trim() || null : null,
    navigateToClosure: terminal && directive !== 'offer_manual_close',
  };
}

function composePending(
  input: ComposeRuntimeSessionInput,
  decisionPanel: RuntimeDecisionPanelSpec | null
): RuntimeSession['pending'] {
  const { mediationState, intervention } = input;

  if (mediationState.sessionOutcome !== 'in_progress') {
    return {
      awaiting: 'nothing',
      awaitingFrom: [],
      satisfiedBy: [],
    };
  }

  const pendingAction = mediationState.pendingAction;

  if (pendingAction && pendingAction.awaitingResponseFrom.length > 0) {
    return {
      awaiting: mapAwaitingParticipants(pendingAction.awaitingResponseFrom),
      awaitingFrom: [...pendingAction.awaitingResponseFrom],
      satisfiedBy: mapSatisfiedByRoles(pendingAction.awaitingResponseFrom),
    };
  }

  const decisionAwaiting = mapDecisionPanelPendingAction(decisionPanel);
  if (decisionAwaiting) {
    return {
      awaiting: decisionAwaiting,
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: mapDecisionPanelSatisfiedBy(decisionPanel),
    };
  }

  if (QUESTION_INTERVENTION_TYPES.has(intervention.type)) {
    return {
      awaiting: 'both_replies',
      awaitingFrom: ['host', 'partner'],
      satisfiedBy: ['host_message', 'partner_message'],
    };
  }

  return {
    awaiting: 'nothing',
    awaitingFrom: [],
    satisfiedBy: [],
  };
}

function composeDiagnostics(input: ComposeRuntimeSessionInput): RuntimeSession['diagnostics'] {
  return {
    explainabilityId: null,
    safetyLevel: input.finalMediatorMessage.safetyLevel,
    fallbackUsed: input.fallbackUsed,
    validationWarnings: [],
  };
}

function resolveSessionStage(
  state: MediationState,
  sessionMemory: SessionMemory
): RuntimeSessionStage {
  if (state.dynamics.mode === 'SAFETY' || state.sessionOutcome === 'safety_stopped') {
    return 'safety_hold';
  }

  if (state.currentGoal === 'CLOSURE' && sessionMemory.runtimeFlowControl?.extensionActive) {
    return 'extension';
  }

  switch (state.currentGoal) {
    case 'SAFE_OPENING':
      return 'intake';
    case 'EMOTION_NAMING':
    case 'PERSPECTIVE_SHARING':
      return 'story_collection';
    case 'EMOTION_UNDERSTANDING':
    case 'REFRAME':
      return 'understanding';
    case 'EMOTION_ACKNOWLEDGMENT':
    case 'NEED_NAMING':
      return 'needs_and_impact';
    case 'AGREEMENT':
      return 'agreement_building';
    case 'FUTURE_PLAN':
      return 'proposal';
    case 'CLOSURE':
      return 'closing';
    default:
      return 'understanding';
  }
}

function resolveRuntimeOutcome(
  state: MediationState,
  sessionMemory: SessionMemory
): RuntimeSessionOutcome {
  const flowControl = sessionMemory.runtimeFlowControl;

  switch (state.sessionOutcome) {
    case 'resolved':
      return 'resolved';
    case 'unresolved_closed':
      return 'closed_without_agreement';
    case 'safety_stopped':
      return 'safety_stopped';
    case 'paused':
      return 'paused';
    case 'in_progress':
      if (flowControl?.proposalPhase === 'rejected') {
        return 'ongoing';
      }
      if (flowControl?.extensionActive) {
        return 'extension_active';
      }
      if (state.agreements.acceptedByBoth || flowControl?.sessionResolvedByEvent) {
        return 'resolved';
      }
      if (flowControl?.proposalPhase === 'presented') {
        return 'proposal_pending';
      }
      if (state.currentGoal === 'FUTURE_PLAN' || state.currentGoal === 'AGREEMENT') {
        return 'proposal_pending';
      }
      if (state.currentGoal === 'CLOSURE') {
        if (flowControl?.continueAfterSummaryAcknowledged) {
          return 'ongoing';
        }
        return 'needs_extension_offer';
      }
      return 'ongoing';
    default:
      return 'ongoing';
  }
}

function resolveNextBeatAfterIntervention(
  interventionType: InterventionType,
  currentGoal: TherapeuticGoal
): MediatorBeat {
  if (SAFETY_INTERVENTION_TYPES.has(interventionType)) {
    return 'safety_intervention';
  }

  if (interventionType === 'welcome_open') {
    return 'deliver_question';
  }

  if (SUMMARY_INTERVENTION_TYPES.has(interventionType)) {
    if (interventionType === 'confirm_agreement' || interventionType === 'celebrate_breakthrough') {
      return currentGoal === 'CLOSURE' ? 'deliver_closure' : 'present_proposal';
    }
    return currentGoal === 'CLOSURE' ? 'deliver_final_summary' : 'deliver_mid_summary';
  }

  if (
    interventionType === 'propose_rule' ||
    interventionType === 'propose_future_plan'
  ) {
    return 'present_proposal';
  }

  if (QUESTION_INTERVENTION_TYPES.has(interventionType)) {
    return 'await_user_action';
  }

  if (currentGoal === 'CLOSURE') {
    return 'deliver_closure';
  }

  return 'deliver_question';
}

function resolveProposalPhase(
  state: MediationState,
  sessionMemory: SessionMemory,
  interventionType: InterventionType
): RuntimeProposalPhase {
  const flowControl = sessionMemory.runtimeFlowControl;

  if (flowControl?.proposalPhase === 'accepted' || flowControl?.proposalPhase === 'rejected') {
    return flowControl.proposalPhase;
  }

  if (state.agreements.acceptedByBoth || state.sessionOutcome === 'resolved') {
    return 'accepted';
  }

  if (flowControl?.proposalPhase === 'presented') {
    return 'presented';
  }

  if (
    flowControl &&
    (flowControl.proposalVotes.host !== 'pending' || flowControl.proposalVotes.partner !== 'pending')
  ) {
    return 'presented';
  }

  if (
    interventionType === 'propose_rule' ||
    interventionType === 'propose_future_plan' ||
    interventionType === 'confirm_agreement'
  ) {
    return 'presented';
  }

  if (state.currentGoal === 'AGREEMENT' || state.currentGoal === 'FUTURE_PLAN') {
    return 'preparing';
  }

  return 'none';
}

function resolveClosureDirective(
  outcome: RuntimeSessionOutcome,
  safetyLevel: FinalMediatorMessage['safetyLevel']
): RuntimeClosureDirective {
  if (outcome === 'safety_stopped' || safetyLevel === 'L3_stop') {
    return 'safety_close';
  }
  if (outcome === 'resolved') {
    return 'close_on_accept';
  }
  if (outcome === 'closed_without_agreement') {
    return 'close_without_agreement';
  }
  if (outcome === 'paused') {
    return 'offer_manual_close';
  }
  return 'none';
}

function resolveSuggestedDbStatus(
  outcome: RuntimeSessionOutcome,
  engineOutcome: SessionOutcome
): RuntimeMediationDbStatus | null {
  if (outcome === 'resolved' || engineOutcome === 'resolved') {
    return 'resolved';
  }
  if (outcome === 'closed_without_agreement' || engineOutcome === 'unresolved_closed') {
    return 'pending_agreements';
  }
  if (outcome === 'ongoing' || outcome === 'extension_active' || outcome === 'proposal_pending') {
    return 'live';
  }
  return null;
}

function buildDeliverables(input: ComposeRuntimeSessionInput): RuntimeUiDeliverable[] {
  const { intervention, finalMediatorMessage } = input;
  const text = finalMediatorMessage.text.trim();
  if (!text) {
    return [];
  }

  const target = intervention.target;

  if (SAFETY_INTERVENTION_TYPES.has(intervention.type)) {
    return [
      {
        kind: 'escalation_notice',
        text,
        target,
      },
    ];
  }

  if (SUMMARY_INTERVENTION_TYPES.has(intervention.type)) {
    return [
      {
        kind: 'summary',
        text,
        target,
        summaryVariant: mapSummaryVariant(intervention.type, intervention.goal),
      },
    ];
  }

  if (intervention.visibility === 'private') {
    const kind: RuntimeUiDeliverableKind =
      target === 'host' ? 'private_hint_host' : 'private_hint_partner';
    return [{ kind, text, target }];
  }

  if (QUESTION_INTERVENTION_TYPES.has(intervention.type)) {
    return [
      {
        kind: 'question',
        text,
        target,
        questionTarget: mapQuestionTarget(target),
      },
    ];
  }

  return [
    {
      kind: 'public_message',
      text,
      target,
    },
  ];
}

function mapSummaryVariant(
  interventionType: InterventionType,
  goal: TherapeuticGoal
): RuntimeSummaryVariant {
  if (interventionType === 'confirm_agreement' || interventionType === 'celebrate_breakthrough') {
    return goal === 'CLOSURE' ? 'closure' : 'final';
  }
  if (goal === 'SAFE_OPENING') {
    return 'opening';
  }
  if (goal === 'CLOSURE') {
    return 'closure';
  }
  return 'mid';
}

function mapQuestionTarget(target: Intervention['target']): RuntimeQuestionTarget {
  if (target === 'host') return 'ty';
  if (target === 'partner') return 'partner';
  return 'oboje';
}

function mapDecisionPanelBlockReason(
  panel: RuntimeDecisionPanelSpec | null
): MediatorBlockReason | null {
  if (!panel) return null;

  switch (panel.kind) {
    case 'proposal_accept_reject':
      return 'awaiting_proposal_decision';
    case 'continue_after_extension':
      return 'awaiting_extension_decision';
    case 'continue_after_summary':
    case 'dispute_resolved_confirm':
      return 'awaiting_continue_decision';
    default:
      return null;
  }
}

function mapDecisionPanelPendingAction(
  panel: RuntimeDecisionPanelSpec | null
): RuntimePendingUserAction | null {
  if (!panel) return null;

  switch (panel.kind) {
    case 'proposal_accept_reject':
      return 'proposal_decision';
    case 'continue_after_extension':
      return 'extension_decision';
    case 'continue_after_summary':
    case 'dispute_resolved_confirm':
      return 'continue_decision';
    default:
      return null;
  }
}

function mapDecisionPanelSatisfiedBy(
  panel: RuntimeDecisionPanelSpec | null
): RuntimeClientEventKind[] {
  if (!panel) return [];

  switch (panel.kind) {
    case 'proposal_accept_reject':
      return ['proposal_accepted', 'proposal_rejected'];
    case 'continue_after_extension':
    case 'continue_after_summary':
    case 'dispute_resolved_confirm':
      return ['continue_session', 'resolve_session'];
    default:
      return [];
  }
}

function mapAwaitingParticipants(
  roles: Array<'host' | 'partner'>
): RuntimePendingUserAction {
  if (roles.includes('host') && roles.includes('partner')) {
    return 'both_replies';
  }
  if (roles.includes('host')) {
    return 'host_reply';
  }
  if (roles.includes('partner')) {
    return 'partner_reply';
  }
  return 'nothing';
}

function mapSatisfiedByRoles(
  roles: Array<'host' | 'partner'>
): RuntimeClientEventKind[] {
  const events: RuntimeClientEventKind[] = [];
  if (roles.includes('host')) {
    events.push('host_message');
  }
  if (roles.includes('partner')) {
    events.push('partner_message');
  }
  return events;
}

function resolvePendingBlockReason(
  roles: Array<'host' | 'partner'>
): MediatorBlockReason {
  if (roles.includes('host') && roles.includes('partner')) {
    return 'awaiting_both_replies';
  }
  if (roles.includes('host')) {
    return 'awaiting_host_reply';
  }
  return 'awaiting_partner_reply';
}

function isSafetyHold(
  safetyLevel: FinalMediatorMessage['safetyLevel'],
  interventionType: InterventionType
): boolean {
  return safetyLevel === 'L3_stop' || SAFETY_INTERVENTION_TYPES.has(interventionType);
}

function estimateCompletion(
  completedGoals: TherapeuticGoal[],
  currentGoal: TherapeuticGoal,
  currentGoalProgressPercent: number
): number {
  const total = THERAPEUTIC_GOAL_ORDER.length;
  const completedWeight = completedGoals.length / total;
  const currentWeight =
    (Math.max(0, currentGoalProgressPercent) / 100) * (1 / total);
  return clampPercent(Math.round((completedWeight + currentWeight) * 100));
}

function uniqueGoals(goals: TherapeuticGoal[]): TherapeuticGoal[] {
  const seen = new Set<TherapeuticGoal>();
  const result: TherapeuticGoal[] = [];
  for (const goal of goals) {
    if (seen.has(goal)) continue;
    seen.add(goal);
    result.push(goal);
  }
  return result;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
