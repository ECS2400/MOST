/**
 * Runtime vs legacy decision panel comparison (Phase UI-B.3c.5b).
 *
 * Diagnostic only — does not drive UI visibility.
 */

import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { LiveLegacyDecisionPanelState } from '@/tests/runtimeComparison/resolveLegacyLiveDecisionPanel';
import type { LiveDecisionPanelKind } from '@/tests/runtimeComparison/resolveLegacyLiveDecisionPanel';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type DecisionPanelMismatchReason =
  | 'runtime_unavailable'
  | 'kind_flow_mismatch'
  | 'kind_visible_mismatch'
  | 'runtime_panel_missing'
  | 'legacy_panel_missing';

export interface LiveDecisionPanelComparison {
  legacy: LiveLegacyDecisionPanelState;
  runtimeKind: LiveDecisionPanelKind;
  runtimeVisible: boolean;
  flowKindsMatch: boolean;
  visibleWouldMatch: boolean;
  mismatchReasons: DecisionPanelMismatchReason[];
}

export function resolveRuntimeLiveDecisionPanelKind(
  runtimeSession: RuntimeSession | null | undefined
): LiveDecisionPanelKind {
  if (!hasRuntimeSession(runtimeSession)) {
    return null;
  }

  return runtimeSession.presentation.showDecisionPanel?.kind ?? null;
}

function collectMismatchReasons(
  legacy: LiveLegacyDecisionPanelState,
  runtimeKind: LiveDecisionPanelKind,
  runtimeAvailable: boolean
): DecisionPanelMismatchReason[] {
  const reasons: DecisionPanelMismatchReason[] = [];

  if (!runtimeAvailable) {
    reasons.push('runtime_unavailable');
    return reasons;
  }

  if (legacy.flowKind !== runtimeKind) {
    reasons.push('kind_flow_mismatch');
  }

  if (legacy.visibleKind !== runtimeKind) {
    reasons.push('kind_visible_mismatch');
  }

  if (legacy.flowKind !== null && runtimeKind === null) {
    reasons.push('runtime_panel_missing');
  }

  if (legacy.flowKind === null && runtimeKind !== null) {
    reasons.push('legacy_panel_missing');
  }

  return reasons;
}

/** Compares runtime decision panel projection with legacy live panel state. */
export function compareLiveDecisionPanels(
  runtimeSession: RuntimeSession | null | undefined,
  legacy: LiveLegacyDecisionPanelState
): LiveDecisionPanelComparison {
  const runtimeAvailable = hasRuntimeSession(runtimeSession);
  const runtimeKind = resolveRuntimeLiveDecisionPanelKind(runtimeSession);
  const runtimeVisible = runtimeAvailable
    ? runtimeSession!.presentation.showDecisionPanel !== null
    : false;
  const mismatchReasons = collectMismatchReasons(legacy, runtimeKind, runtimeAvailable);

  return {
    legacy,
    runtimeKind,
    runtimeVisible,
    flowKindsMatch: runtimeAvailable && legacy.flowKind === runtimeKind,
    visibleWouldMatch: runtimeAvailable && legacy.visibleKind === runtimeKind,
    mismatchReasons,
  };
}

/** DEV-only structured log when comparison state changes. */
export function logLiveDecisionPanelComparison(
  comparison: LiveDecisionPanelComparison
): void {
  if (!__DEV__) return;

  const { legacy, runtimeKind, mismatchReasons } = comparison;
  const payload = {
    legacyFlowKind: legacy.flowKind,
    legacyVisibleKind: legacy.visibleKind,
    runtimeKind,
    flowKindsMatch: comparison.flowKindsMatch,
    visibleWouldMatch: comparison.visibleWouldMatch,
    mismatchReasons,
  };

  if (mismatchReasons.length === 0) {
    console.log('[RuntimeSession] decisionPanel comparison ok', payload);
    return;
  }

  console.warn('[RuntimeSession] decisionPanel comparison mismatch', payload);
}
