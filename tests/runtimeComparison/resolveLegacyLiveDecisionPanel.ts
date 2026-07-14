/**
 * Legacy live decision panel projection (Phase UI-B.3c.5b).
 *
 * Read-only mapping from existing live.tsx booleans / flow stage — does not call
 * computeLiveSessionFlow().
 */

import type { LiveSessionStage } from '@/services/liveMediation';

export type LiveDecisionPanelKind =
  | 'continue_after_summary'
  | 'continue_after_extension'
  | 'proposal_accept_reject'
  | 'dispute_resolved_confirm'
  | null;

export interface LiveLegacyDecisionPanelInput {
  sessionFlowStage: LiveSessionStage | undefined;
  showDecisionPanel: boolean;
  showProposalPanel: boolean;
  sessionUnresolvedClosed: boolean;
  sessionFinished: boolean;
}

export interface LiveLegacyDecisionPanelState {
  /** Kind implied by legacy flow stage (independent of per-user visibility). */
  flowKind: LiveDecisionPanelKind;
  /** Kind actually rendered for the current user right now. */
  visibleKind: LiveDecisionPanelKind;
  showDecisionPanel: boolean;
  showProposalPanel: boolean;
  sessionUnresolvedClosed: boolean;
  sessionFinished: boolean;
}

function resolveLegacyFlowKind(
  sessionFlowStage: LiveSessionStage | undefined
): LiveDecisionPanelKind {
  switch (sessionFlowStage) {
    case 'awaiting_main_decision':
      return 'continue_after_summary';
    case 'awaiting_extension_decision':
      return 'continue_after_extension';
    case 'awaiting_proposal_decision':
      return 'proposal_accept_reject';
    default:
      return null;
  }
}

function resolveLegacyVisibleKind(
  input: LiveLegacyDecisionPanelInput
): LiveDecisionPanelKind {
  if (input.showProposalPanel) {
    return 'proposal_accept_reject';
  }

  if (input.showDecisionPanel) {
    return input.sessionFlowStage === 'awaiting_extension_decision'
      ? 'continue_after_extension'
      : 'continue_after_summary';
  }

  if (input.sessionUnresolvedClosed || input.sessionFinished) {
    return 'dispute_resolved_confirm';
  }

  return null;
}

/** Projects legacy panel booleans into a compact diagnostic shape. */
export function resolveLegacyLiveDecisionPanelState(
  input: LiveLegacyDecisionPanelInput
): LiveLegacyDecisionPanelState {
  return {
    flowKind: resolveLegacyFlowKind(input.sessionFlowStage),
    visibleKind: resolveLegacyVisibleKind(input),
    showDecisionPanel: input.showDecisionPanel,
    showProposalPanel: input.showProposalPanel,
    sessionUnresolvedClosed: input.sessionUnresolvedClosed,
    sessionFinished: input.sessionFinished,
  };
}
