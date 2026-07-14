import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type DecisionPanelKind =
  | 'continue_after_summary'
  | 'continue_after_extension'
  | 'proposal_accept_reject'
  | 'dispute_resolved_confirm'
  | null;

export type RuntimeDecisionPanelSource =
  | 'runtime_available'
  | 'runtime_unavailable'
  | 'hidden';

export interface ResolveRuntimeDecisionPanelVisibilityParams {
  runtimeSession: RuntimeSession | null | undefined;
  runtimeUnavailable?: boolean;
}

export interface RuntimeDecisionPanelVisibility {
  kind: DecisionPanelKind;
  source: RuntimeDecisionPanelSource;
  showMainDecisionPanel: boolean;
  showExtensionDecisionPanel: boolean;
  showProposalPanel: boolean;
  showResolvedConfirmationPanel: boolean;
}

const HIDDEN: RuntimeDecisionPanelVisibility = {
  kind: null,
  source: 'runtime_unavailable',
  showMainDecisionPanel: false,
  showExtensionDecisionPanel: false,
  showProposalPanel: false,
  showResolvedConfirmationPanel: false,
};

/** Maps runtimeSession.presentation.showDecisionPanel to panel visibility flags. */
export function resolveRuntimeDecisionPanelVisibility(
  params: ResolveRuntimeDecisionPanelVisibilityParams
): RuntimeDecisionPanelVisibility {
  if (params.runtimeUnavailable || !hasRuntimeSession(params.runtimeSession)) {
    return HIDDEN;
  }

  const runtimeSession = params.runtimeSession;
  const panel = runtimeSession.presentation.showDecisionPanel;
  const kind = panel?.kind ?? null;

  if (!panel || kind === null) {
    return {
      kind: null,
      source: 'hidden',
      showMainDecisionPanel: false,
      showExtensionDecisionPanel: false,
      showProposalPanel: false,
      showResolvedConfirmationPanel: false,
    };
  }

  return {
    kind,
    source: 'runtime_available',
    showMainDecisionPanel: kind === 'continue_after_summary',
    showExtensionDecisionPanel: kind === 'continue_after_extension',
    showProposalPanel: kind === 'proposal_accept_reject',
    showResolvedConfirmationPanel: kind === 'dispute_resolved_confirm',
  };
}
