import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import type { RuntimePendingUserAction } from '@/types/mediator/runtimeSession';

export type RuntimeInputVisibilityReason =
  | 'available'
  | 'runtime_hidden'
  | 'awaiting_decision'
  | 'proposal_pending'
  | 'safety_hold'
  | 'session_finished'
  | 'processing'
  | 'legacy';

export interface RuntimeInputState {
  visible: boolean;
  enabled: boolean;
  reason: RuntimeInputVisibilityReason;
  source: 'runtime' | 'legacy';
  placeholder: string | null;
}

export interface LegacyInputVisibilityInput {
  showDecisionPanel: boolean;
  showProposalPanel: boolean;
  sessionFinished: boolean;
  awaitingProposalDecision: boolean;
  sessionUnresolvedClosed: boolean;
  paused: boolean;
}

export interface TechnicalInputGuards {
  sending: boolean;
  processing: boolean;
}

export interface ResolveRuntimeInputStateParams {
  runtimeSession: RuntimeSession | null | undefined;
  legacy: LegacyInputVisibilityInput;
  technical: TechnicalInputGuards;
  defaultPlaceholder: string;
  placeholders?: Partial<Record<RuntimeInputVisibilityReason, string>>;
}

interface RuntimeInputBlock {
  blocked: boolean;
  reason: RuntimeInputVisibilityReason;
}

function inferLegacyHiddenReason(legacy: LegacyInputVisibilityInput): RuntimeInputVisibilityReason {
  if (legacy.showDecisionPanel) return 'awaiting_decision';
  if (legacy.showProposalPanel || legacy.awaitingProposalDecision) return 'proposal_pending';
  if (legacy.sessionFinished || legacy.sessionUnresolvedClosed) return 'session_finished';
  return 'legacy';
}

/** Legacy input area visibility — mirrors existing live.tsx render guard. */
export function computeLegacyInputVisible(legacy: LegacyInputVisibilityInput): boolean {
  return (
    !legacy.showDecisionPanel &&
    !legacy.showProposalPanel &&
    !legacy.sessionFinished &&
    !legacy.awaitingProposalDecision &&
    !legacy.sessionUnresolvedClosed
  );
}

function mapPendingToInputReason(
  awaiting: RuntimePendingUserAction
): RuntimeInputVisibilityReason | null {
  switch (awaiting) {
    case 'continue_decision':
    case 'extension_decision':
      return 'awaiting_decision';
    case 'proposal_decision':
      return 'proposal_pending';
    case 'safety_acknowledgment':
      return 'safety_hold';
    default:
      return null;
  }
}

function resolveRuntimeInputBlock(runtimeSession: RuntimeSession): RuntimeInputBlock {
  const { presentation, session, pending } = runtimeSession;

  if (session.stage === 'safety_hold' || session.outcome === 'safety_stopped') {
    return { blocked: true, reason: 'safety_hold' };
  }

  if (
    session.outcome === 'resolved' ||
    session.outcome === 'closed_without_agreement' ||
    session.outcome === 'paused' ||
    runtimeSession.closure.directive !== 'none'
  ) {
    return { blocked: true, reason: 'session_finished' };
  }

  if (presentation.showDecisionPanel) {
    return { blocked: true, reason: 'awaiting_decision' };
  }

  const pendingReason = mapPendingToInputReason(pending.awaiting);
  if (pendingReason === 'awaiting_decision' || pendingReason === 'proposal_pending') {
    return { blocked: true, reason: pendingReason };
  }

  if (pendingReason === 'safety_hold') {
    return { blocked: true, reason: 'safety_hold' };
  }

  if (presentation.hideInput) {
    return { blocked: true, reason: 'runtime_hidden' };
  }

  return { blocked: false, reason: 'available' };
}

function resolvePlaceholder(
  reason: RuntimeInputVisibilityReason,
  defaultPlaceholder: string,
  placeholders?: Partial<Record<RuntimeInputVisibilityReason, string>>
): string | null {
  if (reason === 'available') {
    return defaultPlaceholder;
  }
  return placeholders?.[reason] ?? null;
}

/**
 * Resolves live chat input visibility/enabled state.
 *
 * Runtime blocks overlay legacy visibility; legacy panel guards still apply (flow B unchanged).
 * Technical guards (sending/processing/paused) disable input without hiding it.
 */
export function resolveRuntimeInputState(
  params: ResolveRuntimeInputStateParams
): RuntimeInputState {
  const { runtimeSession, legacy, technical, defaultPlaceholder, placeholders } = params;
  const legacyVisible = computeLegacyInputVisible(legacy);

  if (!legacyVisible) {
    return {
      visible: false,
      enabled: false,
      reason: inferLegacyHiddenReason(legacy),
      source: 'legacy',
      placeholder: null,
    };
  }

  if (!hasRuntimeSession(runtimeSession)) {
    const enabled =
      !legacy.paused && !technical.sending && !technical.processing;
    const reason: RuntimeInputVisibilityReason = technical.processing
      ? 'processing'
      : 'available';

    return {
      visible: true,
      enabled,
      reason,
      source: 'legacy',
      placeholder: resolvePlaceholder(reason === 'processing' ? 'available' : reason, defaultPlaceholder, placeholders),
    };
  }

  const runtimeBlock = resolveRuntimeInputBlock(runtimeSession);
  if (runtimeBlock.blocked) {
    return {
      visible: false,
      enabled: false,
      reason: runtimeBlock.reason,
      source: 'runtime',
      placeholder: resolvePlaceholder(runtimeBlock.reason, defaultPlaceholder, placeholders),
    };
  }

  const enabled =
    !legacy.paused && !technical.sending && !technical.processing;
  const reason: RuntimeInputVisibilityReason = technical.processing
    ? 'processing'
    : 'available';

  return {
    visible: true,
    enabled,
    reason,
    source: 'runtime',
    placeholder: resolvePlaceholder('available', defaultPlaceholder, placeholders),
  };
}

/** Final send guard — combines runtime/legacy input state with non-empty text (category C). */
export function canSubmitLiveMessage(
  inputState: RuntimeInputState,
  messageText: string
): boolean {
  return inputState.enabled && messageText.trim().length > 0;
}
