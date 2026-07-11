import type { InterventionType, MediationState, SessionMemory } from '@/types/mediator';

const PROPOSAL_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'propose_rule',
  'propose_future_plan',
  'confirm_agreement',
]);

export function hasAgreementContent(agreements: MediationState['agreements']): boolean {
  return (
    Boolean(agreements.sharedRule?.trim()) ||
    Boolean(agreements.hostCommitment?.trim()) ||
    Boolean(agreements.partnerCommitment?.trim()) ||
    Boolean(agreements.futurePlan?.trim())
  );
}

/** Whether a proposal is active and awaiting participant votes. */
export function isProposalPresentedForEvents(
  mediationState: MediationState,
  sessionMemory: SessionMemory
): boolean {
  const flowControl = sessionMemory.runtimeFlowControl;
  if (!flowControl) {
    return false;
  }

  if (flowControl.proposalPhase === 'accepted' || flowControl.proposalPhase === 'rejected') {
    return false;
  }

  if (mediationState.agreements.acceptedByBoth || mediationState.sessionOutcome === 'resolved') {
    return false;
  }

  if (!hasAgreementContent(mediationState.agreements)) {
    return false;
  }

  if (flowControl.proposalPhase === 'presented') {
    return true;
  }

  const hasProposalIntervention = sessionMemory.interventionHistory.some((entry) =>
    PROPOSAL_INTERVENTION_TYPES.has(entry.type)
  );

  return (
    hasProposalIntervention ||
    mediationState.currentGoal === 'AGREEMENT' ||
    mediationState.currentGoal === 'FUTURE_PLAN'
  );
}

function countPersistedClosureSummaries(sessionMemory: SessionMemory): number {
  return sessionMemory.interventionHistory.filter(
    (entry) => entry.type === 'summarize_close' && entry.goal === 'CLOSURE'
  ).length;
}

/** Whether resolve_session may apply — user is at a continue/resolve decision point. */
export function isAwaitingResolutionDecision(
  mediationState: MediationState,
  sessionMemory: SessionMemory
): boolean {
  if (mediationState.sessionOutcome !== 'in_progress') {
    return false;
  }

  const flowControl = sessionMemory.runtimeFlowControl;
  if (flowControl?.sessionResolvedByEvent) {
    return false;
  }

  if (mediationState.currentGoal !== 'CLOSURE') {
    return false;
  }

  const closureSummaryCount = countPersistedClosureSummaries(sessionMemory);

  if (closureSummaryCount >= 1 && !flowControl?.continueAfterSummaryAcknowledged) {
    return true;
  }

  if (closureSummaryCount >= 2 && !flowControl?.continueAfterExtensionAcknowledged) {
    return true;
  }

  return false;
}
