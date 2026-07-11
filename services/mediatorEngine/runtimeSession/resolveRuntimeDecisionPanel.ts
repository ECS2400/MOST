/**
 * Runtime decision panel resolver (Phase UI-B.3c.5a).
 *
 * Derives {@link RuntimeDecisionPanelSpec} from engine state only — no message
 * history, no question counters, no UI flow helpers.
 */

import type {
  FinalMediatorMessage,
  Intervention,
  InterventionType,
  MediationState,
  SessionMemory,
} from '@/types/mediator';
import type {
  RuntimeDecisionPanelSpec,
  RuntimeProposalPhase,
  RuntimeSessionOutcome,
} from '@/types/mediator/runtimeSession';

export interface ResolveRuntimeDecisionPanelInput {
  mediationState: MediationState;
  sessionMemory: SessionMemory;
  intervention: Intervention;
  finalMediatorMessage: FinalMediatorMessage;
  runtimeOutcome: RuntimeSessionOutcome;
  proposalPhase: RuntimeProposalPhase;
  turnOrdinal: number;
}

const PROPOSAL_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'propose_rule',
  'propose_future_plan',
  'confirm_agreement',
]);

const SAFETY_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'safety_response',
  'deescalate',
  'pause_session',
]);

/** Whether the session is in an extension round after the first CLOSURE summary. */
export function inferExtensionActive(
  sessionMemory: SessionMemory,
  mediationState: MediationState,
  intervention: Intervention
): boolean {
  if (mediationState.currentGoal !== 'CLOSURE') {
    return false;
  }
  return countClosureSummaries(sessionMemory, intervention) >= 1;
}

/** Counts CLOSURE summarize_close turns, including the current intervention when applicable. */
export function countClosureSummaries(
  sessionMemory: SessionMemory,
  intervention: Intervention
): number {
  let count = sessionMemory.interventionHistory.filter(
    (entry) => entry.type === 'summarize_close' && entry.goal === 'CLOSURE'
  ).length;

  if (intervention.type === 'summarize_close' && intervention.goal === 'CLOSURE') {
    count += 1;
  }

  return count;
}

function hasAgreementContent(agreements: MediationState['agreements']): boolean {
  return (
    Boolean(agreements.sharedRule?.trim()) ||
    Boolean(agreements.hostCommitment?.trim()) ||
    Boolean(agreements.partnerCommitment?.trim()) ||
    Boolean(agreements.futurePlan?.trim())
  );
}

function isSafetyHold(
  safetyLevel: FinalMediatorMessage['safetyLevel'],
  interventionType: InterventionType
): boolean {
  return safetyLevel === 'L3_stop' || SAFETY_INTERVENTION_TYPES.has(interventionType);
}

function resolveProposalDecisionPanel(
  input: ResolveRuntimeDecisionPanelInput
): RuntimeDecisionPanelSpec | null {
  const { mediationState, intervention, proposalPhase, turnOrdinal } = input;

  if (proposalPhase !== 'presented') {
    return null;
  }

  if (mediationState.agreements.acceptedByBoth) {
    return null;
  }

  if (!hasAgreementContent(mediationState.agreements)) {
    return null;
  }

  const proposalIntervention =
    PROPOSAL_INTERVENTION_TYPES.has(intervention.type) ||
    mediationState.currentGoal === 'AGREEMENT' ||
    mediationState.currentGoal === 'FUTURE_PLAN';

  if (!proposalIntervention) {
    return null;
  }

  return {
    kind: 'proposal_accept_reject',
    summaryAnchorTurn: turnOrdinal,
    options: ['accept', 'reject'],
    copyKey: 'runtime.decision.proposal_accept_reject',
  };
}

function resolveSummaryDecisionPanel(
  input: ResolveRuntimeDecisionPanelInput
): RuntimeDecisionPanelSpec | null {
  const { mediationState, sessionMemory, intervention, turnOrdinal } = input;

  if (intervention.type !== 'summarize_close' || mediationState.currentGoal !== 'CLOSURE') {
    return null;
  }

  const closureSummaryCount = countClosureSummaries(sessionMemory, intervention);

  if (closureSummaryCount >= 2) {
    return {
      kind: 'continue_after_extension',
      summaryAnchorTurn: turnOrdinal,
      options: ['continue', 'resolve'],
      copyKey: 'runtime.decision.continue_after_extension',
    };
  }

  if (closureSummaryCount === 1 && input.runtimeOutcome === 'needs_extension_offer') {
    return {
      kind: 'continue_after_summary',
      summaryAnchorTurn: turnOrdinal,
      options: ['continue', 'resolve'],
      copyKey: 'runtime.decision.continue_after_summary',
    };
  }

  return null;
}

/**
 * Resolves whether a decision panel should be shown and which kind/options apply.
 *
 * Priority mirrors legacy flow ordering: proposal → extension → main summary.
 */
export function resolveRuntimeDecisionPanel(
  input: ResolveRuntimeDecisionPanelInput
): RuntimeDecisionPanelSpec | null {
  const { mediationState, finalMediatorMessage, intervention } = input;

  if (mediationState.sessionOutcome !== 'in_progress') {
    return null;
  }

  if (isSafetyHold(finalMediatorMessage.safetyLevel, intervention.type)) {
    return null;
  }

  if (mediationState.dynamics.mode === 'SAFETY') {
    return null;
  }

  return (
    resolveProposalDecisionPanel(input) ??
    resolveSummaryDecisionPanel(input)
  );
}
