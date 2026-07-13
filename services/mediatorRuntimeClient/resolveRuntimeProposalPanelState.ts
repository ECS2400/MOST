import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeProposalVote } from '@/types/mediator/runtimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export interface RuntimeProposalPanelState {
  awaitingProposal: boolean;
  userDecided: boolean;
  hostVote: RuntimeProposalVote;
  partnerVote: RuntimeProposalVote;
  source: 'runtime' | 'legacy';
}

function voteIsDecided(vote: RuntimeProposalVote): boolean {
  return vote === 'accepted' || vote === 'rejected';
}

/** Whether the runtime contract indicates an active proposal decision. */
export function resolveRuntimeAwaitingProposal(
  runtimeSession: RuntimeSession
): boolean {
  if (runtimeSession.proposal.phase === 'presented') {
    return true;
  }

  if (runtimeSession.pending.awaiting === 'proposal_decision') {
    return true;
  }

  return runtimeSession.presentation.showDecisionPanel?.kind === 'proposal_accept_reject';
}

/** Whether the current participant already voted on the proposal. */
export function resolveRuntimeProposalUserDecided(
  runtimeSession: RuntimeSession,
  isCurrentUserHost: boolean
): boolean {
  const vote = isCurrentUserHost
    ? runtimeSession.proposal.votes.host
    : runtimeSession.proposal.votes.partner;
  return voteIsDecided(vote);
}

/**
 * Resolves proposal panel gating from runtimeSession when available.
 * Returns null when runtime contract is absent — caller uses legacy message state.
 */
export function resolveRuntimeProposalPanelState(
  runtimeSession: RuntimeSession | null | undefined,
  isCurrentUserHost: boolean
): RuntimeProposalPanelState | null {
  if (!hasRuntimeSession(runtimeSession)) {
    return null;
  }

  const { proposal } = runtimeSession;

  return {
    awaitingProposal: resolveRuntimeAwaitingProposal(runtimeSession),
    userDecided: resolveRuntimeProposalUserDecided(runtimeSession, isCurrentUserHost),
    hostVote: proposal.votes.host,
    partnerVote: proposal.votes.partner,
    source: 'runtime',
  };
}
