/**
 * Runtime decision panel visibility with safe legacy fallback (Phase UI-B.3c.5c).
 *
 * Uses runtimeSession only when flow-level panel kind matches legacy; per-user
 * visibility gates still come from legacy booleans in both modes.
 */

import { compareLiveDecisionPanels } from '@/services/mediatorRuntimeClient/compareLiveDecisionPanels';
import type { LiveLegacyDecisionPanelState } from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';
import type { LiveDecisionPanelKind } from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';
import type { LiveSessionStage } from '@/services/liveMediation';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type DecisionPanelKind = LiveDecisionPanelKind;

export interface LegacyDecisionPanelVisibilityInput {
  showDecisionPanel: boolean;
  showProposalPanel: boolean;
  sessionUnresolvedClosed: boolean;
}

export interface ResolveRuntimeDecisionPanelVisibilityParams {
  runtimeSession: RuntimeSession | null | undefined;
  legacy: LiveLegacyDecisionPanelState;
  legacyVisibility: LegacyDecisionPanelVisibilityInput;
  sessionFlowStage: LiveSessionStage | undefined;
}

export interface RuntimeDecisionPanelVisibility {
  kind: DecisionPanelKind;
  source: 'runtime_confirmed' | 'legacy_fallback';
  showMainDecisionPanel: boolean;
  showExtensionDecisionPanel: boolean;
  showProposalPanel: boolean;
  showResolvedConfirmationPanel: boolean;
}

function mapLegacyFallbackVisibility(
  kind: DecisionPanelKind,
  legacyVisibility: LegacyDecisionPanelVisibilityInput,
  sessionFlowStage: LiveSessionStage | undefined
): Omit<RuntimeDecisionPanelVisibility, 'source'> {
  const { showDecisionPanel, showProposalPanel, sessionUnresolvedClosed } = legacyVisibility;

  return {
    kind,
    showMainDecisionPanel:
      showDecisionPanel && sessionFlowStage === 'awaiting_main_decision',
    showExtensionDecisionPanel:
      showDecisionPanel && sessionFlowStage === 'awaiting_extension_decision',
    showProposalPanel: showProposalPanel,
    showResolvedConfirmationPanel: sessionUnresolvedClosed,
  };
}

function mapRuntimeConfirmedVisibility(
  kind: DecisionPanelKind,
  legacyVisibility: LegacyDecisionPanelVisibilityInput
): Omit<RuntimeDecisionPanelVisibility, 'source'> {
  const { showDecisionPanel, showProposalPanel, sessionUnresolvedClosed } = legacyVisibility;

  return {
    kind,
    showMainDecisionPanel:
      kind === 'continue_after_summary' && showDecisionPanel,
    showExtensionDecisionPanel:
      kind === 'continue_after_extension' && showDecisionPanel,
    showProposalPanel: kind === 'proposal_accept_reject' && showProposalPanel,
    showResolvedConfirmationPanel:
      kind === 'dispute_resolved_confirm' && sessionUnresolvedClosed,
  };
}

/**
 * Resolves which decision panels to show.
 *
 * Runtime drives visibility only when {@link compareLiveDecisionPanels} reports
 * matching flow kinds; otherwise legacy booleans are used unchanged.
 */
export function resolveRuntimeDecisionPanelVisibility(
  params: ResolveRuntimeDecisionPanelVisibilityParams
): RuntimeDecisionPanelVisibility {
  const { runtimeSession, legacy, legacyVisibility, sessionFlowStage } = params;
  const comparison = compareLiveDecisionPanels(runtimeSession, legacy);
  const useRuntime = comparison.flowKindsMatch;

  if (!useRuntime) {
    return {
      source: 'legacy_fallback',
      ...mapLegacyFallbackVisibility(
        legacy.visibleKind ?? legacy.flowKind,
        legacyVisibility,
        sessionFlowStage
      ),
    };
  }

  return {
    source: 'runtime_confirmed',
    ...mapRuntimeConfirmedVisibility(comparison.runtimeKind, legacyVisibility),
  };
}
