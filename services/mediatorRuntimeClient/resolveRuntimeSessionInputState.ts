import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import type { RuntimePendingUserAction } from '@/types/mediator/runtimeSession';

export type RuntimeInputVisibilityReason =
  | 'available'
  | 'runtime_hidden'
  | 'runtime_unavailable'
  | 'awaiting_decision'
  | 'proposal_pending'
  | 'safety_hold'
  | 'session_finished'
  | 'processing';

export interface RuntimeInputState {
  visible: boolean;
  enabled: boolean;
  reason: RuntimeInputVisibilityReason;
  source: 'runtime_available' | 'runtime_unavailable';
  placeholder: string | null;
}

export interface TechnicalInputGuards {
  sending: boolean;
  processing: boolean;
  paused?: boolean;
}

export interface ResolveRuntimeInputStateParams {
  runtimeSession: RuntimeSession | null | undefined;
  runtimeUnavailable?: boolean;
  technical: TechnicalInputGuards;
  defaultPlaceholder: string;
  placeholders?: Partial<Record<RuntimeInputVisibilityReason, string>>;
}

interface RuntimeInputBlock {
  blocked: boolean;
  reason: RuntimeInputVisibilityReason;
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

/** Resolves live chat input visibility from runtimeSession only. */
export function resolveRuntimeInputState(
  params: ResolveRuntimeInputStateParams
): RuntimeInputState {
  const { runtimeSession, runtimeUnavailable, technical, defaultPlaceholder, placeholders } =
    params;

  if (runtimeUnavailable || !hasRuntimeSession(runtimeSession)) {
    return {
      visible: false,
      enabled: false,
      reason: 'runtime_unavailable',
      source: 'runtime_unavailable',
      placeholder: null,
    };
  }

  const runtimeBlock = resolveRuntimeInputBlock(runtimeSession);
  if (runtimeBlock.blocked) {
    return {
      visible: false,
      enabled: false,
      reason: runtimeBlock.reason,
      source: 'runtime_available',
      placeholder: resolvePlaceholder(runtimeBlock.reason, defaultPlaceholder, placeholders),
    };
  }

  const enabled =
    !technical.paused && !technical.sending && !technical.processing;
  const reason: RuntimeInputVisibilityReason = technical.processing
    ? 'processing'
    : 'available';

  return {
    visible: true,
    enabled,
    reason,
    source: 'runtime_available',
    placeholder: resolvePlaceholder('available', defaultPlaceholder, placeholders),
  };
}

/** Final send guard — runtime input state plus non-empty text. */
export function canSubmitLiveMessage(
  inputState: RuntimeInputState,
  messageText: string
): boolean {
  return inputState.enabled && messageText.trim().length > 0;
}
